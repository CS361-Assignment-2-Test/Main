const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const multer = require('multer'); 
const upload = multer({ dest: 'uploads/' }); // Configure temporary upload destination
const csvHeaders = 'type,category,amount,date\n';
const validateEntry = require('./validator/validator'); // adjust path if needed
const LOG_FILE = path.join(__dirname, 'upload.log');
const USERS_FILE = path.join(__dirname, 'secrets/users.json');
const bcrypt = require('bcrypt');

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

// Route: Upload and process CSV file
app.post('/upload-csv', upload.single('csvFile'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const filePath = req.file.path;
  const validEntries = [];
  const invalidEntries = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const { valid, sanitized, message } = validateEntry(row);
      if (valid) {
        validEntries.push(`${sanitized.type},${sanitized.category},${sanitized.amount},${sanitized.date}`);
      } else {
        invalidEntries.push({ row, message });
      }
    })
    .on('end', () => {
      fs.unlinkSync(filePath); // clean up temp file

      const logLines = [];
      const timestamp = new Date().toISOString();

      logLines.push(`[${timestamp}] Uploaded CSV with ${validEntries.length} valid and ${invalidEntries.length} invalid entries.`);

      invalidEntries.forEach(({ row, message }, idx) => {
        logLines.push(`  Invalid row #${idx + 1}: ${JSON.stringify(row)} => ${message}`);
      });

      fs.appendFileSync(LOG_FILE, logLines.join('\n') + '\n\n');

      if (validEntries.length === 0) {
        return res.status(400).json({ message: 'Upload failed: all rows were invalid.' });
      }

      const rowsToAdd = '\n' + validEntries.join('\n');
      fs.appendFile(CSV_FILE, rowsToAdd, (err) => {
        if (err) {
          console.error('Error saving valid entries:', err);
          return res.status(500).json({ message: 'Upload failed: server error writing data.' });
        }

        return res.json({ message: `Uploaded ${validEntries.length} entries.` });
      });
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] CSV parsing error: ${err.message}\n\n`);
      res.status(500).json({ message: 'Upload failed: CSV parsing error.' });
    });
});


const chokidar = require('chokidar');

const WATCH_DIR = path.join(__dirname, 'uploads');

// Ensure the directory exists
if (!fs.existsSync(WATCH_DIR)) {
  fs.mkdirSync(WATCH_DIR);
}

const watcher = chokidar.watch(WATCH_DIR, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', filePath => {
  const fileName = path.basename(filePath);

  // Skip temporary or incomplete files
  if (!fileName.endsWith('.csv')) {
    //console.log(`Ignored non-CSV file: ${fileName}`);
    return;
  }

  console.log(`Detected CSV file: ${fileName}`);

  const entries = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (row.type && row.category && row.amount && row.date) {
        entries.push(`${row.type},${row.category},${row.amount},${row.date}`);
      }
    })
    .on('end', () => {
      fs.appendFile(CSV_FILE, '\n' + entries.join('\n'), (err) => {
        fs.unlinkSync(filePath); // Delete the uploaded file
        if (err) {
          console.error(`Failed to append entries from ${fileName}`);
        } else {
          console.log(`Processed and added ${entries.length} entries from ${fileName}`);
        }
      });
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
    });
});

console.log(`File watcher is running. Watching folder: ${WATCH_DIR}`);

const validateCredentials = require('./credentials/validator');

app.post('/validate', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.status(400).send('Missing credentials');

  const result = await validateCredentials(username, password);
  res.send(result.toString()); // '1' or '0'
});

app.post('/create-account', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields');

  try {
    const data = fs.existsSync(USERS_FILE) ? fs.readFileSync(USERS_FILE) : '{"users":[]}';
    const parsed = JSON.parse(data);
    const users = parsed.users;

    if (users.find(u => u.username === username)) {
      return res.status(400).send('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    users.push({ username, passwordHash });

    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
    res.send('Account created successfully');
  } catch (err) {
    console.error('Account creation error:', err);
    res.status(500).send('Internal server error');
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
