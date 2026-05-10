require('dotenv').config();

const path = require('path');
const express = require('express');
const { getAssignments } = require('./lib/lms');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const publicDir = path.join(__dirname, 'public');
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.use(express.static(publicDir));

app.get('/api/lms/assignments', async (req, res) => {
  try {
    const data = await getAssignments();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(port, () => {
  console.log(`AkaDash LMS (Atlas) — http://localhost:${port}`);
  console.log('Durdurmak için: Ctrl+C');
});
