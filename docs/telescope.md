# NodeTelescope

NodeTelescope is a monitoring and debugging tool for Node.js applications, inspired by Laravel Telescope. It provides insights into the requests coming into your application, logs, and other events.

## Installation

```bash
npm install node-telescope
```

## Usage

```javascript
const NodeTelescope = require('node-telescope');
const express = require('express');

const app = express();

const telescope = new NodeTelescope({
  storage: {
    type: 'file',
    options: { path: './telescope-data' }
  },
  watchedEntries: ['requests', 'logs', 'errors'],
  port: 3000,
  routePrefix: '/telescope'
});

app.use(telescope.middleware());

// Your routes here

telescope.listen(3000);
app.listen(4000, () => {
  console.log('Main app is running on http://localhost:4000');
});
```

## Configuration

The `NodeTelescope` constructor accepts an options object with the following properties:

- `storage` (Object): Storage configuration
  - `type` (string): Storage type (currently only 'file' is supported)
  - `options` (Object): Options for the storage system
- `watchedEntries` (Array): Types of entries to watch (e.g., ['requests', 'logs', 'errors'])
- `port` (number): Port for the Telescope server
- `routePrefix` (string): URL prefix for Telescope routes
- `logFile` (string): Path to the log file
- `prune` (Object): Pruning configuration
  - `interval` (number): Interval for pruning in milliseconds
  - `maxAge` (number): Maximum age of entries before pruning in milliseconds

## API

### NodeTelescope.prototype.middleware()

Returns an Express middleware function for capturing request and response data.

```javascript
app.use(telescope.middleware());
```

### NodeTelescope.prototype.listen(port)

Starts the Telescope server.

- `port` (number): The port to listen on

```javascript
telescope.listen(3000);
```

### NodeTelescope.prototype.log(level, message, metadata)

Logs a message with the specified level and metadata.

- `level` (string): Log level
- `message` (string): Log message
- `metadata` (Object): Additional metadata for the log entry

```javascript
telescope.log('info', 'User logged in', { userId: 123 });
```

### NodeTelescope.prototype.storeEntry(entry)

Stores an entry in the Telescope storage.

- `entry` (Object): The entry to store

```javascript
telescope.storeEntry({
  type: 'custom',
  message: 'Custom event occurred',
  data: { /* custom data */ }
});
```

### NodeTelescope.prototype.getEntries(query)

Retrieves entries based on the provided query.

- `query` (Object): Query parameters for filtering entries

```javascript
telescope.getEntries({ type: 'request', page: 1, perPage: 50 })
  .then(entries => console.log(entries))
  .catch(error => console.error('Failed to retrieve entries:', error));
```

## Events

NodeTelescope emits the following events:

- `'newEntry'`: Emitted when a new entry is stored, with the entry as the argument.

```javascript
telescope.on('newEntry', (entry) => {
  console.log('New entry stored:', entry);
});
```

## Extending NodeTelescope

You can extend NodeTelescope by subclassing it and overriding or adding methods:

```javascript
class CustomTelescope extends NodeTelescope {
  constructor(options) {
    super(options);
    // Custom initialization
  }

  customMethod() {
    // Custom functionality
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
