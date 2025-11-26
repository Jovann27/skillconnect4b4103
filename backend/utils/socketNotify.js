import { io, onlineUsers } from "../server.js";
import Notification from "../models/notification.js";

export const sendNotification = async (userId, title, message, meta = {}) => {
    try {
        const notification = await Notification.create({
            user: userId,
            title,
            message,
            meta,
        });

        const socketId = onlineUsers.get(userId.toString());
        if (socketId) {
            io.to(socketId).emit("new-notification", {
                title,
                message,
                meta,
                createdAt: notification.createdAt,
            });
            console.log(`Real-Time notification sent to user ${userId}`);
        }
        return notification;
    } catch (err) {
        console.error("Send Notification error:", err.message);
        return null;
    }
};

