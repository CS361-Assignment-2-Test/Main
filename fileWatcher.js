const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const csv = require('csv-parser');
const fetch = require('node-fetch'); // npm install node-fetch

const WATCH_DIR = path.join(__dirname, '../uploads');
const MAIN_SERVER_URL = 'http://localhost:3000/trigger-upload';

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR);

const watcher = chokidar.watch(WATCH_DIR, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', filePath => {
  const fileName = path.basename(filePath);
  if (!fileName.endsWith('.csv')) return;

  console.log(`📁 Detected new CSV file: ${fileName}`);

  // Notify the main program
  fetch(MAIN_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath })
  })
  .then(res => res.text())
  .then(data => console.log(`Main program responded: ${data}`))
  .catch(err => console.error('Error notifying main program:', err));
});

console.log(` File Trigger Detector running. Watching: ${WATCH_DIR}`);
