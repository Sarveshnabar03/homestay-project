const express = require("express");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, "uploads/");
  },
  filename: function(req, file, cb){
    cb(null, Date.now() + "-review-" + file.originalname);
  }
});

const upload = multer({ storage });

// ADD REVIEW ONLY IF BOOKING IS APPROVED
router.post("/add", upload.single("photo"), (req, res) => {
  const { user_id, room_id, booking_id, rating, review } = req.body;
  const photo = req.file ? req.file.filename : "";

  if(!user_id || !room_id || !booking_id || !rating || !review){
    return res.status(400).json({
      success:false,
      message:"Please fill all review details"
    });
  }

  const checkSql = `
    SELECT * FROM bookings
    WHERE id=? AND user_id=? AND room_id=? AND status='Approved'
  `;

  db.query(checkSql, [booking_id, user_id, room_id], (err, booking) => {
    if(err){
      console.log(err);
      return res.status(500).json({ success:false, message:"Database error" });
    }

    if(booking.length === 0){
      return res.status(403).json({
        success:false,
        message:"Only approved booking users can review"
      });
    }

    db.query("SELECT * FROM reviews WHERE booking_id=?", [booking_id], (err, oldReview) => {
      if(err){
        console.log(err);
        return res.status(500).json({ success:false, message:"Database error" });
      }

      if(oldReview.length > 0){
        return res.status(409).json({
          success:false,
          message:"You already reviewed this booking"
        });
      }

      const sql = `
        INSERT INTO reviews 
        (user_id, room_id, booking_id, rating, review, photo)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(sql, [user_id, room_id, booking_id, rating, review, photo], (err) => {
        if(err){
          console.log(err);
          return res.status(500).json({ success:false, message:"Review failed" });
        }

        res.json({
          success:true,
          message:"Review added successfully"
        });
      });
    });
  });
});

// GET REVIEWS BY ROOM
router.get("/room/:room_id", (req, res) => {
  const sql = `
    SELECT 
      reviews.*,
      users.name AS user_name,
      users.email AS user_email
    FROM reviews
    LEFT JOIN users ON reviews.user_id = users.id
    WHERE reviews.room_id=?
    ORDER BY reviews.id DESC
  `;

  db.query(sql, [req.params.room_id], (err, result) => {
    if(err){
      console.log(err);
      return res.status(500).json([]);
    }

    res.json(result);
  });
});

module.exports = router;