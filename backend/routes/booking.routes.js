const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-payment-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// BOOK ROOM
router.post("/book", (req, res) => {
  const {
    user_id, room_id, date, checkout_date,
    customer_name, customer_email, customer_phone,
    guests, message
  } = req.body;

  if (!user_id || !room_id || !date || !checkout_date || !customer_name || !customer_email || !customer_phone || !guests) {
    return res.status(400).json({ success:false, message:"Please fill all booking details" });
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  if (new Date(date) < today) {
    return res.status(400).json({ success:false, message:"Cannot book past date" });
  }

  db.query("SELECT * FROM rooms WHERE id=? AND is_available=TRUE", [room_id], (err, result) => {
    if (err) return res.status(500).json({ success:false, message:"Database error (room check)" });
    if (!result || result.length === 0) return res.status(404).json({ success:false, message:"Room not available" });

    db.query("SELECT * FROM bookings WHERE room_id=? AND date=?", [room_id, date], (conflictErr, conflictRows) => {
      if (conflictErr) return res.status(500).json({ success:false, message:"Database validation error" });
      if (conflictRows.length > 0) return res.status(409).json({ success:false, message:"Room already booked for this date" });

      const sql = `
        INSERT INTO bookings
        (user_id, room_id, date, checkout_date, customer_name, customer_email, customer_phone, guests, message, status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending')
      `;

      db.query(sql, [user_id, room_id, date, checkout_date, customer_name, customer_email, customer_phone, guests, message || ""], (insertErr) => {
        if (insertErr) {
          console.log(insertErr);
          return res.status(500).json({ success:false, message:"Booking failed" });
        }

        db.query("INSERT INTO notifications (user_id, message) VALUES (0, 'New booking request received')", () => {});

        res.status(200).json({ success:true, message:"Booking request sent successfully" });
      });
    });
  });
});

// GET USER BOOKINGS
router.get("/my/:user_id", (req, res) => {
  const sql = `
    SELECT
      bookings.*,
      rooms.title AS room_name,
      rooms.location AS room_location,
      rooms.image AS room_image,
      rooms.price AS room_price
    FROM bookings
    LEFT JOIN rooms ON bookings.room_id = rooms.id
    WHERE bookings.user_id=?
    ORDER BY bookings.id DESC
  `;

  db.query(sql, [req.params.user_id], (err, result) => {
    if (err) return res.status(500).send("Failed to fetch bookings");
    res.json(result);
  });
});

// CANCEL BOOKING
router.put("/cancel/:id", (req, res) => {
  db.query(
    "UPDATE bookings SET status='Rejected' WHERE id=? AND status='Pending'",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ success:false, message:"Failed to cancel booking" });
      if (result.affectedRows === 0) return res.status(400).json({ success:false, message:"Only pending bookings can be cancelled" });

      res.json({ success:true, message:"Booking cancelled successfully" });
    }
  );
});

// MANUAL PAYMENT SCREENSHOT UPLOAD
router.post("/upload-payment", upload.single("payment_screenshot"), (req, res) => {
  const { booking_id, payment_note } = req.body;
  const screenshot = req.file ? req.file.filename : "";

  if (!booking_id || !screenshot) {
    return res.status(400).json({
      success:false,
      message:"Please upload payment screenshot"
    });
  }

  db.query(
    "UPDATE bookings SET payment_status='Submitted', payment_screenshot=?, payment_note=? WHERE id=?",
    [screenshot, payment_note || "", booking_id],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success:false, message:"Payment proof upload failed" });
      }

      res.json({
        success:true,
        message:"Payment proof submitted successfully. Admin will verify it."
      });
    }
  );
});

module.exports = router;