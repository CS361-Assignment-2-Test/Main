const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

const CSV_FILE = path.join(__dirname, 'finance_data.csv');

app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure CSV has headers
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'type,category,amount,date\n');
}

app.post('/add-entry', (req, res) => {
    const { type, category, amount, date } = req.body;
    const row = `\n${type},${category},${amount},${date}`;
    fs.appendFile(CSV_FILE, row, (err) => {
        if (err) return res.status(500).send('Failed to save');
        res.send('Saved');
    });
});

const csv = require('csv-parser');

app.get('/get-expenses', (req, res) => {
  const results = [];

  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => {
      if (data.type === 'expense') {
        results.push(data);
      }
    })
    .on('end', () => {
      res.json(results);
    });
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
