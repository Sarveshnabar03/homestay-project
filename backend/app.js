const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ROUTES
const bookingRoutes = require("./routes/booking.routes");
const adminRoutes = require("./routes/admin.routes");
const roomRoutes = require("./routes/room.routes");
const authRoutes = require("./routes/auth.routes");

app.use("/api/booking", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reviews", require("./routes/review.routes"));
app.use("/api/chat", require("./routes/chat.routes"));

// SOCKET CHAT
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinBookingChat", (bookingId) => {
    socket.join("booking_" + bookingId);
    console.log("Joined chat:", "booking_" + bookingId);
  });

  socket.on("sendMessage", (data) => {
    const { booking_id, sender_role, sender_id, message } = data;

    if (
      !booking_id ||
      !sender_role ||
      sender_id === undefined ||
      sender_id === null ||
      !message
    ) {
      console.log("Invalid message data:", data);
      return;
    }

    const sql = `
      INSERT INTO messages 
      (booking_id, sender_role, sender_id, message)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [booking_id, sender_role, sender_id, message], (err, result) => {
      if (err) {
        console.log("CHAT ERROR:", err);
        return;
      }

      const savedMessage = {
        id: result.insertId,
        booking_id,
        sender_role,
        sender_id,
        message,
        created_at: new Date()
      };

      io.to("booking_" + booking_id).emit("receiveMessage", savedMessage);
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});