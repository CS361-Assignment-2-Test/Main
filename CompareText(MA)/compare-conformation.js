// compare-confirmation.js - Microservice A
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4003;

app.use(express.json());

const PROMPT_FILE = path.join(__dirname, 'prompt.txt');
const INPUT_FILE = path.join(__dirname, 'user_input.txt');
const RESULT_FILE = path.join(__dirname, 'compared_result.txt');

function fileToArray(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return text.trim().split(/\s+/);
  } catch (err) {
    return [];
  }
}

function countMatchingWords(array1, array2) {
  const minLen = Math.min(array1.length, array2.length);
  const maxLen = Math.max(array1.length, array2.length);
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (array1[i].toLowerCase() === array2[i].toLowerCase()) {
      matches++;
    }
  }
  return [matches, maxLen];
}

app.post('/compare-confirmation', (req, res) => {
  try {
    const promptWords = fileToArray(PROMPT_FILE);
    const inputWords = fileToArray(INPUT_FILE);
    const [match, total] = countMatchingWords(promptWords, inputWords);
    const result = `${match}/${total}`;

    fs.writeFileSync(RESULT_FILE, result);
    res.send(result);
  } catch (err) {
    console.error('Error comparing confirmation:', err);
    res.status(500).send('0/0');
  }
});

app.listen(PORT, () => {
  console.log(`Microservice A (confirmation checker) running on http://localhost:${PORT}`);
});
