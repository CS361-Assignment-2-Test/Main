const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const csvHeaders = 'type,category,amount,date\n';

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_FILE = path.join(__dirname, 'finance_data.csv');

app.use(bodyParser.json());
app.use(express.static('public'));

// Route: Add a new entry (income or expense)
app.post('/add-entry', (req, res) => {
  const { type, category, amount, date } = req.body;

  if (!type || !category || !amount || !date) {
    return res.status(400).send('Missing fields in entry');
  }

  const row = `${type},${category},${amount},${date}\n`;
  fs.appendFile(CSV_FILE, row, (err) => {
    if (err) {
      console.error('Error writing to CSV:', err);
      return res.status(500).send('Failed to add entry');
    }
    res.send('Entry added successfully');
  });
});

app.post('/delete-entry', (req, res) => {
  const { index } = req.body;
  if (index === undefined) return res.status(400).send('Index required');

  const results = [];
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', () => {
      if (index < 0 || index >= results.length) return res.status(404).send('Invalid index');
      results.splice(index, 1);
      const updatedCSV = csvHeaders + results.map(e =>
        `${e.type},${e.category},${e.amount},${e.date}`).join('\n') + '\n';
      fs.writeFile(CSV_FILE, updatedCSV, err => {
        if (err) return res.status(500).send('Failed to delete entry');
        res.send('Entry deleted');
      });
    });
});

app.post('/edit-entry', (req, res) => {
  const { index, updated } = req.body;
  if (index === undefined || !updated) return res.status(400).send('Index and updated data required');

  const results = [];
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', () => {
      if (index < 0 || index >= results.length) return res.status(404).send('Invalid index');
      results[index] = updated;
      const updatedCSV = csvHeaders + results.map(e =>
        `${e.type},${e.category},${e.amount},${e.date}`).join('\n') + '\n';
      fs.writeFile(CSV_FILE, updatedCSV, err => {
        if (err) return res.status(500).send('Failed to edit entry');
        res.send('Entry updated');
      });
    });
});

// Route: Get only expense entries
app.get('/get-expenses', (req, res) => {
  const results = [];
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => {
      if (data.type === 'expense') {
        results.push(data);
      }
    })
    .on('end', () => res.json(results))
    .on('error', (err) => {
      console.error('CSV read error:', err);
      res.status(500).send('Failed to read data');
    });
});

// Route: Get all entries (income + expense)
app.get('/get-all-entries', (req, res) => {
  const results = [];
  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => res.json(results))
    .on('error', (err) => {
      console.error('CSV read error:', err);
      res.status(500).send('Failed to read data');
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
