const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");

const qrStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-payment-qr-" + file.originalname);
  }
});

const qrUpload = multer({ storage: qrStorage });

// BOOKINGS + FULL USER DETAILS
router.get("/bookings", (req, res) => {
  const sql = `
    SELECT 
      bookings.*,
      users.name,
      users.email,
      users.phone,
      rooms.title AS room_title,
      rooms.price AS room_price,
      rooms.location AS room_location,
      rooms.image AS room_image
    FROM bookings
    LEFT JOIN users ON bookings.user_id = users.id
    LEFT JOIN rooms ON bookings.room_id = rooms.id
    ORDER BY bookings.id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

// ACCEPT BOOKING
router.put("/accept/:id", (req, res) => {
  const bookingId = req.params.id;

  db.query("UPDATE bookings SET status='Approved' WHERE id=?", [bookingId], (err) => {
    if (err) return res.status(500).send("Error approving booking");

    db.query("SELECT user_id FROM bookings WHERE id=?", [bookingId], (e, r) => {
      if (r && r.length > 0) {
        db.query(
          "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
          [r[0].user_id, "Your booking is APPROVED"]
        );
      }
    });

    res.send("Approved");
  });
});

// REJECT BOOKING
router.put("/reject/:id", (req, res) => {
  const bookingId = req.params.id;

  db.query("UPDATE bookings SET status='Rejected' WHERE id=?", [bookingId], (err) => {
    if (err) return res.status(500).send("Error rejecting booking");

    db.query("SELECT user_id FROM bookings WHERE id=?", [bookingId], (e, r) => {
      if (r && r.length > 0) {
        db.query(
          "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
          [r[0].user_id, "Your booking is REJECTED"]
        );
      }
    });

    res.send("Rejected");
  });
});

// MARK PAYMENT PAID
router.put("/mark-paid/:id", (req, res) => {
  const bookingId = req.params.id;

  db.query("UPDATE bookings SET payment_status='Paid' WHERE id=?", [bookingId], (err) => {
    if (err) return res.status(500).send("Failed to mark payment paid");

    db.query("SELECT user_id FROM bookings WHERE id=?", [bookingId], (e, r) => {
      if (r && r.length > 0) {
        db.query(
          "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
          [r[0].user_id, "Your payment is VERIFIED and marked as PAID"]
        );
      }
    });

    res.send("Payment marked as Paid");
  });
});

// REJECT PAYMENT
router.put("/reject-payment/:id", (req, res) => {
  const bookingId = req.params.id;

  db.query("UPDATE bookings SET payment_status='Rejected' WHERE id=?", [bookingId], (err) => {
    if (err) return res.status(500).send("Failed to reject payment");

    db.query("SELECT user_id FROM bookings WHERE id=?", [bookingId], (e, r) => {
      if (r && r.length > 0) {
        db.query(
          "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
          [r[0].user_id, "Your payment proof was REJECTED. Please upload again."]
        );
      }
    });

    res.send("Payment rejected");
  });
});

// DASHBOARD STATS
router.get("/stats", (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(status='Approved') AS approved,
      SUM(status='Rejected') AS rejected,
      SUM(status='Pending') AS pending
    FROM bookings
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({});
    res.json(result[0]);
  });
});

// USER NOTIFICATIONS
router.get("/notifications/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(result);
    }
  );
});

// DELETE BOOKING REQUEST
router.delete("/delete-booking/:id", (req, res) => {
  db.query("DELETE FROM bookings WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).send("Failed to delete booking");
    res.send("Booking request deleted");
  });
});

// GET ALL REVIEWS
router.get("/reviews", (req, res) => {
  const sql = `
    SELECT 
      reviews.*,
      users.name AS user_name,
      users.email AS user_email,
      rooms.title AS room_title,
      rooms.location AS room_location
    FROM reviews
    LEFT JOIN users ON reviews.user_id = users.id
    LEFT JOIN rooms ON reviews.room_id = rooms.id
    ORDER BY reviews.id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json([]);
    res.json(result);
  });
});

// DELETE REVIEW
router.delete("/delete-review/:id", (req, res) => {
  db.query("DELETE FROM reviews WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).send("Failed to delete review");
    res.send("Review deleted successfully");
  });
});

// GET PAYMENT QR
router.get("/payment-qr", (req, res) => {
  db.query("SELECT * FROM payment_qr WHERE id=1", (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({});
    }

    res.json(result[0] || {});
  });
});

// UPLOAD / UPDATE PAYMENT QR
router.post("/payment-qr", qrUpload.single("qr_image"), (req, res) => {
  const qrImage = req.file ? req.file.filename : "";

  if (!qrImage) {
    return res.status(400).send("Please upload QR image");
  }

  db.query("UPDATE payment_qr SET qr_image=? WHERE id=1", [qrImage], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("QR upload failed");
    }

    res.send("QR uploaded successfully");
  });
});

// DELETE PAYMENT QR
router.delete("/payment-qr", (req, res) => {
  db.query("UPDATE payment_qr SET qr_image='' WHERE id=1", (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("QR delete failed");
    }

    res.send("QR deleted successfully");
  });
});

module.exports = router;