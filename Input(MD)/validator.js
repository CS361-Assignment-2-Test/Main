const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4002;

app.use(bodyParser.json());

function validateInput(entry) {
  const result = { valid: false, message: '', sanitized: {} };

  const { type, category, amount, date } = entry;

  if (!type || !['income', 'expense'].includes(type.toLowerCase())) {
    result.message = "Missing or invalid 'type' field";
    return result;
  }

  if (!category || typeof category !== 'string') {
    result.message = "Missing or invalid 'category' field";
    return result;
  }

  const cleanCategory = category.trim().replace(/<[^>]*>/g, '').replace(/[^a-zA-Z0-9 _-]/g, '');

  if (!amount || isNaN(parseFloat(amount))) {
    result.message = "Missing or invalid 'amount' field";
    return result;
  }

  if (!date || isNaN(Date.parse(date))) {
    result.message = "Missing or invalid 'date' field";
    return result;
  }

  result.valid = true;
  result.sanitized = {
    type: type.toLowerCase(),
    category: cleanCategory,
    amount: parseFloat(amount),
    date: date
  };

  return result;
}

app.post('/validate', (req, res) => {
  const result = validateInput(req.body);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Input Validator running on port ${PORT}`);
});
