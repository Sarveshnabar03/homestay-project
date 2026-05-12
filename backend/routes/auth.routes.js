const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = "secret123";

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, hashed, "user"], (err, result) => {
    if (err) return res.send("User already exists");
    res.send("Registered successfully");
  });
});

// LOGIN
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email=?";

  db.query(sql, [email], async (err, result) => {
    if (err) return res.send("Database error");

    if (result.length === 0) return res.send("User not found");

    const user = result[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.send("Wrong password");

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      SECRET
    );

    res.json({
      token: token,
      role: user.role,
      name: user.name,
      email: user.email
    });
  });
});

module.exports = router;