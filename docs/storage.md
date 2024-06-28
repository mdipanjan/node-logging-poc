# FileStorage

FileStorage is a class that handles storing and retrieving log entries for NodeTelescope. It uses the file system to store entries as JSON files.

## Usage

```javascript
const FileStorage = require('./storage');

const storage = new FileStorage({
  path: './telescope-data',
  maxEntriesPerFile: 1000,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  pruneInterval: 60 * 60 * 1000 // 1 hour
});
```

## Configuration

The `FileStorage` constructor accepts an options object with the following properties:

- `path` (string): Directory path for storing log files
- `maxEntriesPerFile` (number): Maximum number of entries per file
- `maxAge` (number): Maximum age of entries before pruning (in milliseconds)
- `pruneInterval` (number): Interval for running the pruning process (in milliseconds)

## API

### FileStorage.prototype.storeEntry(entry)

Stores a new entry in the appropriate file.

- `entry` (Object): The entry to store

```javascript
storage.storeEntry({
  id: 'unique-id',
  type: 'request',
  method: 'GET',
  url: '/api/users',
  timestamp: new Date().toISOString()
});
```

### FileStorage.prototype.getEntry(id)

Retrieves a specific entry by its ID.

- `id` (string): The ID of the entry to retrieve

```javascript
storage.getEntry('unique-id')
  .then(entry => console.log(entry))
  .catch(error => console.error('Failed to retrieve entry:', error));
```

### FileStorage.prototype.getEntries(query)

Retrieves entries based on the provided query parameters.

- `query` (Object): Query parameters for filtering entries
  - `method` (string): HTTP method to filter by
  - `startDate` (string): Start date for filtering entries
  - `endDate` (string): End date for filtering entries
  - `page` (number): Page number for pagination
  - `perPage` (number): Number of entries per page

```javascript
storage.getEntries({ method: 'GET', page: 1, perPage: 50 })
  .then(entries => console.log(entries))
  .catch(error => console.error('Failed to retrieve entries:', error));
```

### FileStorage.prototype.getRecentEntries(limit)

Retrieves the most recent entries.

- `limit` (number): Maximum number of entries to retrieve

```javascript
storage.getRecentEntries(100)
  .then(entries => console.log(entries))
  .catch(error => console.error('Failed to retrieve recent entries:', error));
```

### FileStorage.prototype.prune()

Removes old files based on the `maxAge` setting.

```javascript
storage.prune()
  .then(() => console.log('Pruning completed'))
  .catch(error => console.error('Failed to prune old entries:', error));
```

### FileStorage.prototype.setStoragePath(newPath)

Changes the storage path at runtime.

- `newPath` (string): New path for storing log files

```javascript
storage.setStoragePath('./new-telescope-data');
```

### FileStorage.prototype.setMaxEntriesPerFile(maxEntries)

Updates the maximum number of entries per file at runtime.

- `maxEntries` (number): New maximum number of entries per file

```javascript
storage.setMaxEntriesPerFile(2000);
```

### FileStorage.prototype.setMaxAge(maxAge)

Updates the maximum age for entries at runtime.

- `maxAge` (number): New maximum age in milliseconds

```javascript
storage.setMaxAge(48 * 60 * 60 * 1000); // 48 hours
```

### FileStorage.prototype.forcePrune()

Manually triggers the pruning process.

```javascript
storage.forcePrune()
  .then(() => console.log('Manual pruning completed'))
  .catch(error => console.error('Failed to manually prune entries:', error));
```

## Events

FileStorage extends `EventEmitter` and emits the following event:

- `'newEntry'`: Emitted when a new entry is stored, with the entry as the argument.

```javascript
storage.on('newEntry', (entry) => {
  console.log('New entry stored:', entry);
});
```

## File Structure

Entries are stored in JSON files with names formatted as `{type}-{date}.json`, for example:

- `http-2023-06-28.json`
- `log-2023-06-28.json`

Each file contains an array of entry objects.

## Extending FileStorage

You can extend FileStorage by subclassing it and overriding or adding methods:

```javascript
class CustomStorage extends FileStorage {
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
