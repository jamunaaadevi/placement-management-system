const bcrypt = require('bcrypt');

bcrypt.hash('company123', 10).then(hash => {
    console.log('Password: company123');
    console.log('Hash:', hash);
    console.log('\nCopy this hash and use it in your SQL script below.');
});