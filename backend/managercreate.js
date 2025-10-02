const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'admin123'; 
  const hashed = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hashed);
}

hashPassword();