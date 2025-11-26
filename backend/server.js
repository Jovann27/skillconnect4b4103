import dotenv from "dotenv";
process.env.DOTENV_CONFIG_SILENT = 'true';
dotenv.config();

import app from "./app.js";
import { dbConnection } from "./database/dbConnection.js";
import "./config/cloudinaryConfig.js";

import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import User from "./models/userSchema.js";
import Chat from "./models/chat.js";
import Booking from "./models/booking.js";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || FRONTEND_URL).split(",").map(s => s.trim());

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error("CORS policy: origin not allowed"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  }
});

const onlineUsers = new Map();

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("No token provided"));
    }

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return next(new Error("Token expired"));
      } else if (jwtError.name === 'JsonWebTokenError') {
        return next(new Error("Invalid token"));
      } else {
        return next(new Error("Token verification failed"));
      }
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error("User not found"));
    }

    // Check if user is banned
    if (user.banned) {
      return next(new Error("Account is banned"));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket authentication error:", err.message);
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log("Client Connected", socket.id, "User:", socket.userId);

  // Register user as online
  onlineUsers.set(socket.userId, socket.id);
  console.log(`Registered user ${socket.userId} with socket ${socket.id}`);

  // Update user online status
  User.findByIdAndUpdate(socket.userId, { isOnline: true })
    .then(() => console.log(`User ${socket.userId} is now online`))
    .catch(err => console.error("Error updating online status:", err));

  // Handle joining chat rooms (appointment/booking based)
  socket.on("join-chat", async (appointmentId) => {
    try {
      // Verify user has access to this appointment
      const booking = await Booking.findOne({
        _id: appointmentId,
        $or: [
          { requester: socket.userId },
          { provider: socket.userId }
        ]
      });

      if (booking) {
        socket.join(`chat-${appointmentId}`);
        console.log(`User ${socket.userId} joined chat room for appointment ${appointmentId}`);

        // Send chat history
        const chatHistory = await Chat.find({ appointment: appointmentId })
          .populate('sender', 'firstName lastName profilePic')
          .sort({ createdAt: 1 });

        socket.emit("chat-history", chatHistory);
      } else {
        socket.emit("error", "Access denied to this chat");
      }
    } catch (error) {
      console.error("Error joining chat:", error);
      socket.emit("error", "Failed to join chat");
    }
  });

  // Handle joining service request rooms
  socket.on("join-service-request", async (requestId) => {
    try {
      const ServiceRequest = (await import("./models/serviceRequest.js")).default;
      // Verify user has access to this service request
      const request = await ServiceRequest.findOne({
        _id: requestId,
        $or: [
          { requester: socket.userId },
          { serviceProvider: socket.userId },
          { targetProvider: socket.userId }
        ]
      });

      if (request || socket.user.role === "admin") {
        socket.join(`service-request-${requestId}`);
        console.log(`User ${socket.userId} joined service request room for ${requestId}`);
      } else {
        socket.emit("error", "Access denied to this service request");
      }
    } catch (error) {
      console.error("Error joining service request:", error);
      socket.emit("error", "Failed to join service request");
    }
  });

  // Handle sending messages
  socket.on("send-message", async (data) => {
    try {
      const { appointmentId, message } = data;

      // Verify user has access to this appointment
      const booking = await Booking.findOne({
        _id: appointmentId,
        $or: [
          { requester: socket.userId },
          { provider: socket.userId }
        ]
      });

      if (!booking) {
        socket.emit("error", "Access denied to this chat");
        return;
      }

      // Save message to database
      const chatMessage = await Chat.create({
        appointment: appointmentId,
        sender: socket.userId,
        message: message.trim(),
        status: 'sent'
      });

      // Populate sender info
      await chatMessage.populate('sender', 'firstName lastName profilePic');

      // Send to all users in the chat room
      io.to(`chat-${appointmentId}`).emit("new-message", chatMessage);

      // Send notification to other user if they're online
      const otherUserId = booking.requester.toString() === socket.userId
        ? booking.provider.toString()
        : booking.requester.toString();

      const otherSocketId = onlineUsers.get(otherUserId);
      if (otherSocketId && otherSocketId !== socket.id) {
        io.to(otherSocketId).emit("message-notification", {
          appointmentId,
          message: chatMessage,
          from: socket.user.firstName + " " + socket.user.lastName
        });
      }

      console.log(`Message sent in chat ${appointmentId} by user ${socket.userId}`);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", "Failed to send message");
    }
  });

  // Handle typing indicators
  socket.on("typing", (appointmentId) => {
    socket.to(`chat-${appointmentId}`).emit("user-typing", {
      userId: socket.userId,
      userName: socket.user.firstName + " " + socket.user.lastName
    });
  });

  socket.on("stop-typing", (appointmentId) => {
    socket.to(`chat-${appointmentId}`).emit("user-stopped-typing", {
      userId: socket.userId
    });
  });

  // Handle message seen status
  socket.on("message-seen", async (data) => {
    try {
      const { messageId, appointmentId } = data;

      // Update message status and seenBy array
      await Chat.findByIdAndUpdate(messageId, {
        status: 'seen',
        $addToSet: {
          seenBy: {
            user: socket.userId,
            seenAt: new Date()
          }
        }
      });

      // Notify sender that message was seen
      const message = await Chat.findById(messageId).populate('sender');
      if (message && message.sender._id.toString() !== socket.userId) {
        const senderSocketId = onlineUsers.get(message.sender._id.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("message-seen-update", {
            messageId,
            seenBy: socket.user.firstName + " " + socket.user.lastName,
            appointmentId
          });
        }
      }
    } catch (error) {
      console.error("Error updating message seen status:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userId);
    console.log(`User ${socket.userId} disconnected`);

    // Update user online status
    User.findByIdAndUpdate(socket.userId, { isOnline: false })
      .then(() => console.log(`User ${socket.userId} is now offline`))
      .catch(err => console.error("Error updating offline status:", err));
  });
});

export { io, onlineUsers };

dbConnection();

server.listen(PORT, () => {
  console.log(`Server running at http://10.139.216.204:${PORT}`);
});
