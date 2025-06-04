const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

// Directory to watch for CSV files
const WATCH_DIR = path.join(__dirname, 'uploads');

// Initialize watcher
const watcher = chokidar.watch(WATCH_DIR, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', filePath => {
  const fileName = path.basename(filePath);

  // Ignore temporary or incomplete files
  if (!fileName.endsWith('.csv')) {
    //console.log(`Ignored non-CSV file: ${fileName}`);
    return;
  }

  // Process valid CSV files
  console.log(`Detected valid CSV file: ${fileName}`);

  // Optional: Trigger further processing here
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return console.error(`Error reading ${fileName}:`, err);
    console.log(`Contents of ${fileName}:\n`, data);
  });
});

watcher.on('error', error => {
  console.error('Watcher error:', error);
});

console.log(`Watching directory for CSV files: ${WATCH_DIR}`);
