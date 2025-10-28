const express = require('express');
const app = express();
const port = 3001; // Port for our backend API

app.get('/', (req, res) => {
  res.send('GreenChainz Backend API is running!');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
