const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_FILE = path.join(__dirname, '../secrets/users.json');
const LOG_FILE = path.join(__dirname, '../loginresponse.txt');

// Uniform delay to prevent timing attacks (e.g., 300ms)
const uniformDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Format the current date and time as a string
function getTimestamp() {
  return new Date().toISOString(); // e.g., "2025-06-02T20:21:30.123Z"
}

async function validateCredentials(username, password) {
  const start = Date.now();
  let success = false;

  try {
    const data = fs.readFileSync(USERS_FILE);
    const json = JSON.parse(data);
    const users = json.users;
    const user = users.find(u => u.username === username);

    if (user) {
      const match = await bcrypt.compare(password, user.passwordHash);
      success = match;
    }

    if (!user) await bcrypt.compare(password, "$2b$10$invalidfakestring..............");

  } catch (err) {
    console.error('Credential validation error:', err);
  }

  const elapsed = Date.now() - start;
  const minResponseTime = 300;
  if (elapsed < minResponseTime) {
    await uniformDelay(minResponseTime - elapsed);
  }

  const result = success ? 1 : 0;
  const timestamp = getTimestamp();
  const logLine = `${timestamp} - Username: ${username} - Result: ${result}\n`;
  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) console.error('Error writing to loginresponse.txt:', err);
  });

  return result;
}

module.exports = validateCredentials;
