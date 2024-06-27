const express = require('express');
const NodeTelescope = require('./telescope');

const app = express();

const telescope = new NodeTelescope({ logFile: 'my-app-logs.log' });

app.use(telescope.middleware());

app.get('/', (req, res) => {
  res.json({
    "uuid": "9957ba86-4ff8-4a53-8884-60f611269d55",
    "type": "charge",
    "created_at": "2023-06-06 11:05:05",
  });
});

const telescopeServer = telescope.listen(3000);

app.listen(4000, () => {
  console.log('Main app is running on http://localhost:4000');
});
