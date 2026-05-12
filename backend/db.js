require('dotenv').config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "", // Set your MySQL root password here or in .env
  database: process.env.DB_NAME || "homestay"
});

db.connect(err => {
  if (err) {
    console.log("DB Error:", err);
    console.log(
      "Please start MySQL and verify backend/.env contains DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
    );
  } else {
    console.log("MySQL Connected");
  }
});

module.exports = db;