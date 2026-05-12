const express = require("express");
const router = express.Router();
const db = require("../db");

// GET CHAT MESSAGES BY BOOKING
router.get("/:booking_id", (req, res) => {
  const bookingId = req.params.booking_id;

  db.query(
    "SELECT * FROM messages WHERE booking_id=? ORDER BY created_at ASC",
    [bookingId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json([]);
      }

      res.json(result);
    }
  );
});

module.exports = router;