const express = require('express');
const app = express();

app.get('/will', (req, res) => {
  res.json({ response: 'Hello World' });
});

// Optional root route
app.get('/', (req, res) => {
  res.send('Home Page Working!');
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
