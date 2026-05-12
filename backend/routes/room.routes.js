const express = require("express");
const multer = require("multer");
const db = require("../db");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// =======================
// ADD ROOM WITH MAIN IMAGE + GALLERY IMAGES
// =======================
router.post(
  "/add",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "bedroomImage", maxCount: 1 },
    { name: "bathroomImage", maxCount: 1 },
    { name: "balconyImage", maxCount: 1 },
    { name: "outsideImage", maxCount: 1 }
  ]),
  (req, res) => {
    console.log("BODY DATA:", req.body);
    console.log("FILE DATA:", req.files);

    const title = req.body.title;
    const description = req.body.description;
    const price = req.body.price;
    const location = req.body.location;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;

    const image =
      req.files && req.files.image && req.files.image[0]
        ? req.files.image[0].filename
        : "";

    if (!title || !description || !price || !location || !latitude || !longitude || !image) {
      return res.status(400).send("Please fill all fields, select main image and select location on map");
    }

    const sql = `
      INSERT INTO rooms 
      (title, description, price, image, is_available, location, latitude, longitude)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `;

    db.query(
      sql,
      [title, description, price, image, location, latitude, longitude],
      (err, result) => {
        if (err) {
          console.log("ROOM INSERT ERROR:", err);
          return res.status(500).send("Database error");
        }

        const roomId = result.insertId;

        const galleryValues = [];

        if (req.files.bedroomImage && req.files.bedroomImage[0]) {
          galleryValues.push([roomId, req.files.bedroomImage[0].filename, "Bedroom"]);
        }

        if (req.files.bathroomImage && req.files.bathroomImage[0]) {
          galleryValues.push([roomId, req.files.bathroomImage[0].filename, "Bathroom"]);
        }

        if (req.files.balconyImage && req.files.balconyImage[0]) {
          galleryValues.push([roomId, req.files.balconyImage[0].filename, "Balcony"]);
        }

        if (req.files.outsideImage && req.files.outsideImage[0]) {
          galleryValues.push([roomId, req.files.outsideImage[0].filename, "Outside View"]);
        }

        if (galleryValues.length === 0) {
          return res.send("Room added successfully with location");
        }

        db.query(
          "INSERT INTO room_images (room_id, image, image_type) VALUES ?",
          [galleryValues],
          (galleryErr) => {
            if (galleryErr) {
              console.log("GALLERY INSERT ERROR:", galleryErr);
              return res.status(500).send("Room added but gallery images failed");
            }

            res.send("Room added successfully with location and gallery images");
          }
        );
      }
    );
  }
);

// =======================
// GET ALL ROOMS WITH GALLERY
// =======================
router.get("/all", (req, res) => {
  const sql = `
    SELECT 
      r.id,
      r.title,
      r.description,
      r.price,
      r.image,
      r.is_available,
      r.location,
      r.latitude,
      r.longitude,
      ri.id AS gallery_id,
      ri.image AS gallery_image,
      ri.image_type AS gallery_type
    FROM rooms r
    LEFT JOIN room_images ri ON r.id = ri.room_id
    ORDER BY r.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.log("ROOM FETCH ERROR:", err);
      return res.status(500).json([]);
    }

    const roomsMap = {};

    rows.forEach(row => {
      if (!roomsMap[row.id]) {
        roomsMap[row.id] = {
          id: row.id,
          title: row.title,
          description: row.description,
          price: row.price,
          image: row.image,
          is_available: row.is_available,
          location: row.location,
          latitude: row.latitude,
          longitude: row.longitude,
          gallery: []
        };
      }

      if (row.gallery_id) {
        roomsMap[row.id].gallery.push({
          id: row.gallery_id,
          image: row.gallery_image,
          image_type: row.gallery_type
        });
      }
    });

    res.json(Object.values(roomsMap));
  });
});

// =======================
// TOGGLE AVAILABILITY
// =======================
router.put("/toggle/:id", (req, res) => {
  db.query(
    "UPDATE rooms SET is_available = IF(is_available = 1, 0, 1) WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send("Error updating room");
      res.send("Room availability updated");
    }
  );
});

// =======================
// DELETE ROOM
// =======================
router.delete("/delete/:id", (req, res) => {
  const roomId = req.params.id;

  db.query("DELETE FROM room_images WHERE room_id = ?", [roomId], (galleryErr) => {
    if (galleryErr) {
      console.log(galleryErr);
      return res.status(500).send("Error deleting room gallery");
    }

    db.query("DELETE FROM rooms WHERE id = ?", [roomId], (err) => {
      if (err) return res.status(500).send("Error deleting room");
      res.send("Room deleted");
    });
  });
});

module.exports = router;