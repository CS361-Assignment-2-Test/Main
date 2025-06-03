const bcrypt = require('bcrypt');

const passwordToHash = 'admin123'; // replace with the password you want to hash
const saltRounds = 10;

bcrypt.hash(passwordToHash, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Hashed password:', hash);
  }
});