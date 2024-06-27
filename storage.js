const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
  
class FileStorage extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      path: path.join(process.cwd(), 'telescope-storage'),
      maxEntriesPerFile: 1000,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      pruneInterval: 60 * 60 * 1000, // 1 hour
      ...options
    };
    this.pendingEntries = new Map();
    this.ensureStorageDir();
    this.startPruning();
  }

  async ensureStorageDir() {
    try {
      await fs.mkdir(this.options.path, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  startPruning() {
    setInterval(() => this.prune(), this.options.pruneInterval);
  }
  async storeEntry(entry) {
    console.log('Attempting to store entry:', entry);
    const fileName = this.getFileName('http');
    const filePath = path.join(this.options.path, fileName);
    console.log('File path:', filePath);

    try {
      let entries = [];
      try {
        const data = await fs.readFile(filePath, 'utf8');
        entries = JSON.parse(data);
        console.log('Existing entries:', entries.length);
      } catch (error) {
        console.log('No existing file or empty file, starting with empty array');
      }

      if (entry.type === 'request') {
        console.log('Storing request entry');
        this.pendingEntries.set(entry.id, entry);
      } else if (entry.type === 'response') {
        console.log('Processing response entry');
        const requestEntry = this.pendingEntries.get(entry.id);
        if (requestEntry) {
          console.log('Found matching request entry');
          const combinedEntry = {
            id: requestEntry.id,
            timestamp: requestEntry.timestamp,
            method: requestEntry.method,
            url: requestEntry.url,
            headers: requestEntry.headers,
            body: requestEntry.body, // Include request body
            ip: requestEntry.ip,
            statusCode: entry.statusCode,
            responseTime: entry.responseTime,
            responseBody: entry.responseBody
          };
          entries.push(combinedEntry);
          this.pendingEntries.delete(entry.id);
          this.emit('newEntry', combinedEntry);
          console.log('Combined entry stored');
        } else {
          console.log('No matching request found for response, storing response separately');
          entries.push(entry);
        }
      } else {
        console.log('Storing non-request/response entry');
        entries.push(entry);
      }

      if (entries.length > this.options.maxEntriesPerFile) {
        entries = entries.slice(-this.options.maxEntriesPerFile);
      }

      await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
      console.log('File written successfully');
    } catch (error) {
      console.error('Failed to store entry:', error);
    }
  }

  async getEntry(id) {
    const files = await fs.readdir(this.options.path);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.options.path, file);
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const entries = JSON.parse(data);
          const entry = entries.find(e => e.id === id);
          if (entry) return entry;
        } catch (error) {
          console.error(`Failed to read file ${file}:`, error);
        }
      }
    }
    return null;
  }


  async getEntries(query = {}) {
    const files = await fs.readdir(this.options.path);
    let allEntries = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.options.path, file);
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const entries = JSON.parse(data);
          allEntries = allEntries.concat(entries);
        } catch (error) {
          console.error(`Failed to read file ${file}:`, error);
        }
      }
    }
    if (query.method) {
      allEntries = allEntries.filter(entry => entry.method === query.method);
    }
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      allEntries = allEntries.filter(entry => new Date(entry.timestamp) >= startDate);
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      allEntries = allEntries.filter(entry => new Date(entry.timestamp) <= endDate);
    }
    allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const page = parseInt(query.page) || 1;
    const perPage = parseInt(query.perPage) || 100;
    const startIndex = (page - 1) * perPage;
    const paginatedEntries = allEntries.slice(startIndex, startIndex + perPage);
    return {
      entries: paginatedEntries,
      totalEntries: allEntries.length,
      page,
      perPage,
      totalPages: Math.ceil(allEntries.length / perPage)
    };
  }

 getFileName(type) {
    return `${type}-${new Date().toISOString().split('T')[0]}.json`;
  }

  async getRecentEntries(limit = 100) {
    const { entries } = await this.getEntries({ perPage: limit });
    return entries;
  }

  async prune() {
    const files = await fs.readdir(this.options.path);
    const now = Date.now();

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.options.path, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > this.options.maxAge) {
            await fs.unlink(filePath);
            console.log(`Pruned old file: ${file}`);
          }
        } catch (error) {
          console.error(`Failed to prune file ${file}:`, error);
        }
      }
    }
  }



  // Method to change storage path at runtime
  setStoragePath(newPath) {
    this.options.path = newPath;
    this.ensureStorageDir();
  }

  // Method to update max entries per file at runtime
  setMaxEntriesPerFile(maxEntries) {
    this.options.maxEntriesPerFile = maxEntries;
  }

  // Method to update max age for entries at runtime
  setMaxAge(maxAge) {
    this.options.maxAge = maxAge;
  }

  // Method to manually trigger pruning
  forcePrune() {
    return this.prune();
  }
}

module.exports = FileStorage;
