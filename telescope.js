const winston = require('winston');
const express = require('express');
const http = require('http');
const path = require('path');
const SocketIO = require('socket.io');
const FileStorage = require('./storage');
const { v4: uuidv4 } = require('uuid');
const {Writable} = require('stream');
const bodyParser = require('body-parser');

class NodeTelescope {
  constructor(options = {}) {
    this.options = {
      storage: {
        type: 'file',
        options: {}
      },
      watchedEntries: ['requests', 'logs', 'errors'],
      port: 3000,
      routePrefix: '/telescope',
      logFile: 'telescope.log',
      prune: {
        interval: 60 * 60 * 1000, // 1 hour
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      ...options
    };

    this.setupStorage();
    this.setupLogger();
    this.setupExpress();
    this.setupPruning();
  }

  setupStorage() {
    if (this.options.storage.type === 'file') {
      this.storage = new FileStorage(this.options.storage.options);
    } else {
      throw new Error('Unsupported storage type');
    }
  }

  setupLogger() {
    // Create a custom writable stream
    const telescopeStream = new Writable({
      write: (chunk, encoding, next) => {
        const logEntry = JSON.parse(chunk.toString());
        this.storage.storeEntry({
          type: 'log',
          level: logEntry.level,
          message: logEntry.message,
          timestamp: logEntry.timestamp,
          metadata: logEntry.metadata
        }).catch(err => console.error('Failed to store log entry:', err));
        next();
      }
    });

    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: this.options.logFile }),
        new winston.transports.Stream({ stream: telescopeStream })
      ],
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata(),
        winston.format.json()
      )
    });
  }


  setupExpress() {
    this.app = express();
    // body parsing middleware
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
        
    
    // Serve static files for the Telescope UI
    this.app.use(this.options.routePrefix, express.static(path.join(__dirname, 'public')));

    // API routes
    this.app.get(`${this.options.routePrefix}/api/entries`, async (req, res) => {
      try {
        const entries = await this.storage.getEntries(req.query);
        res.json(entries);
      } catch (error) {
        console.error('Failed to retrieve entries:', error);
        res.status(500).json({ error: 'Failed to retrieve entries' });
      }
    });
    
    this.app.get(`${this.options.routePrefix}/api/entries/:id`, async (req, res) => {
      try {
        const logEntry = await this.storage.getEntry(req.params.id);
        if (logEntry) {
            res.json(logEntry);
        } else {
            res.status(404).json({ error: 'Log entry not found' });
        }
    } catch (error) {
        console.error('Error fetching log entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }


      
  });
  
  
  }

  setupPruning() {
    setInterval(() => {
      this.storage.prune(this.options.prune.maxAge);
    }, this.options.prune.interval);
  }

  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      const entryId = uuidv4();

      // Capture request body (already parsed by bodyParser)
      let requestBody = '';
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        requestBody = JSON.stringify(req.body);
      }

      const requestEntry = {
        id: entryId,
        type: 'request',
        method: req.method,
        url: req.url,
        ip: req.ip,
        headers: req.headers,
        body: requestBody,
        timestamp: new Date().toISOString()
      };

      if (this.options.watchedEntries.includes('requests')) {
        this.storage.storeEntry(requestEntry);
      }

      // Capture response data
      const chunks = [];
      const originalWrite = res.write;
      const originalEnd = res.end;

      res.write = function(chunk) {
        chunks.push(Buffer.from(chunk));
        originalWrite.apply(res, arguments);
      };

      res.end = function(chunk) {
        if (chunk) {
          chunks.push(Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks).toString('utf8');

        const responseTime = Date.now() - startTime;

        const responseEntry = {
          id: entryId,
          type: 'response',
          statusCode: res.statusCode,
          responseTime,
          responseBody: body.substring(0, 1000)
        };

        if (this.options.watchedEntries.includes('requests')) {
          this.storage.storeEntry(responseEntry);
        }

        originalEnd.apply(res, arguments);
      }.bind(this);

      next();
    };
  }


  setupSocketIO(server) {
    this.io = SocketIO(server);
    this.io.on('connection', async (socket) => {
      try {
        const recentEntries = await this.storage.getRecentEntries(100);
        socket.emit('initialEntries', recentEntries);
      } catch (error) {
        console.error('Failed to send initial entries:', error);
      }

      this.storage.on('newEntry', (entry) => {
        socket.emit('newEntry', entry);
      });
    });
  }

  listen(port) {
    const server = http.createServer(this.app);
    this.setupSocketIO(server);
    
    server.listen(port || this.options.port, () => {
      console.log(`Telescope is running on http://localhost:${port || this.options.port}${this.options.routePrefix}`);
    });
    
    return server;
  }

  // Method to manually log entries
  log(level, message, metadata = {}) {
    this.logger.log(level, message, metadata);
  }

  // Method to manually store an entry
  storeEntry(entry) {
    return this.storage.storeEntry(entry);
  }

  // Method to retrieve entries
  getEntries(query) {
    return this.storage.getEntries(query);
  }
}

module.exports = NodeTelescope;