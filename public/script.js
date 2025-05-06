document.getElementById('entryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const data = {
      type: document.getElementById('type').value,
      category: document.getElementById('category').value,
      amount: parseFloat(document.getElementById('amount').value),
      date: document.getElementById('date').value
    };
  
    const res = await fetch('/add-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  
    const msg = await res.text();
    document.getElementById('message').textContent = msg;
  });
  