const express = require('express');
const cors = require('cors');
const NodeTelescope = require('./telescope');
const bodyParser = require('body-parser');

const app = express();

// Apply CORS middleware
app.use(cors());

// Serve static files
app.use(express.static('js'));

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Telescope
const telescope = new NodeTelescope({
  storage: {
    type: 'file',
    options: {
      path: './telescope-data',
    }
  },
  watchedEntries: ['requests', 'logs', 'errors'],
  port: 3000,
  routePrefix: '/telescope'
});

// Apply Telescope middleware after body parsing
app.use(telescope.middleware());

// Routes
app.get('/', (req, res) => {
  res.send('Hello Home page!');
});

app.get('/app', (req, res) => {
  res.json({
    "uuid": "9957ba86-4ff8-4a53-8884-60f611269d55",
    "type": "charge",
    "created_at": "2023-06-06 11:05:05",
  });
});

app.post('/app-post', (req, res) => {
  console.log('===================== DURING call', req.body);
  res.json({
    "uuid": "9957ba86-4ff8-4a53-8884-60f611269d55",
    "type": "charge",
    "created_at": "2023-06-06 11:05:05",
  });
});

// Start Telescope server
telescope.listen(3000);

// Start main app
app.listen(4000, () => {
  console.log('Main app is running on http://localhost:4000');
});
