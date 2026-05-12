require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true // Allow multiple SQL statements
});

db.connect(err => {
  if (err) {
    console.log('DB Connection Error:', err);
    return;
  }
  console.log('Connected to MySQL');

  // Read and execute schema.sql
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  db.query(schema, (err, result) => {
    if (err) {
      console.log('Schema execution error:', err);
    } else {
      console.log('Schema executed successfully');
    }
    db.end();
  });
});