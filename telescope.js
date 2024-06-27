const winston = require('winston');
const express = require('express');
const http = require('http');
const path = require('path');
const SocketIO = require('socket.io');
const { Writable } = require('stream');

class NodeTelescope {
  constructor(options = {}) {
    this.logs = [];
    this.options = options;
    this.setupLogger();
    this.setupExpress();
  }

  setupLogger() {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: this.options.logFile || 'telescope.log' })
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
    this.app.get('/telescope', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Log request
      this.logger.info('Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        headers: req.headers
      });

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

        // Log response after it has been sent
        process.nextTick(() => {
          this.logger.info('Outgoing response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime,
            body: body.substring(0, 1000) // Limit body size in logs
          });
        });

        originalEnd.apply(res, arguments);
      }.bind(this);

      next();
    };
  }

  setupSocketIO(server) {
    this.io = SocketIO(server);
    this.io.on('connection', (socket) => {
      socket.emit('logs', this.logs);
    });

    // Create a custom writable stream
    const socketStream = new Writable({
      write: (chunk, encoding, next) => {
        const logObject = JSON.parse(chunk.toString());
        this.logs.push(logObject);
        this.io.emit('newLog', logObject);
        next();
      }
    });

    // Add a custom transport to emit logs via Socket.IO
    this.logger.add(new winston.transports.Stream({ stream: socketStream }));
  }

  getLogs() {
    return this.logs;
  }

  listen(port) {
    const server = http.createServer(this.app);
    this.setupSocketIO(server);
    
    server.listen(port, () => {
      console.log(`Telescope GUI is running on http://localhost:${port}/telescope`);
    });
    
    return server;
  }
}

module.exports = NodeTelescope;

