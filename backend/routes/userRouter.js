import express from "express";
import { register, login, logout, getMyProfile, getUserProfile, updateProfile, updateUserPassword, getPasswordLength, sendVerificationOTP, verifyOTP, resetPassword, getNotificationPreferences, updateNotificationPreferences, getBlockedUsers, blockUser, unblockUser, getFavourites, addToFavourites, removeFromFavourites } from "../controllers/userController.js";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount } from "../controllers/notificationController.js";
import { getChatHistory, sendMessage, getChatList, markMessagesAsSeen } from "../controllers/userFlowController.js";
import { reportUser } from "../controllers/reportsController.js";
import { isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", isUserAuthenticated, getMyProfile);
router.get("/profile/:userId", getUserProfile);
router.put("/update-profile", isUserAuthenticated, updateProfile);
router.get("/me/password", isUserAuthenticated, getPasswordLength);
router.put("/password/update", isUserAuthenticated, updateUserPassword)

// Email verification for password reset
router.post("/send-verification-otp", sendVerificationOTP);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Notifications
router.get("/notifications", isUserAuthenticated, getUserNotifications);
router.put("/notifications/:id/read", isUserAuthenticated, markNotificationAsRead);
router.put("/notifications/mark-all-read", isUserAuthenticated, markAllNotificationsAsRead);
router.get("/notifications/unread-count", isUserAuthenticated, getUnreadCount);

// Notification Preferences
router.get("/notification-preferences", isUserAuthenticated, getNotificationPreferences);
router.put("/notification-preferences", isUserAuthenticated, updateNotificationPreferences);

// Blocked Users Management
router.get("/blocked-users", isUserAuthenticated, getBlockedUsers);
router.post("/block-user", isUserAuthenticated, blockUser);
router.delete("/unblock-user/:targetUserId", isUserAuthenticated, unblockUser);

// Chat routes
router.get("/chat-history", isUserAuthenticated, getChatHistory);
router.get("/chat-list", isUserAuthenticated, getChatList);
router.post("/send-message", isUserAuthenticated, sendMessage);
router.put("/chat/:appointmentId/mark-seen", isUserAuthenticated, markMessagesAsSeen);

// Favourites Management
router.get("/favourites", isUserAuthenticated, getFavourites);
router.post("/add-to-favourites", isUserAuthenticated, addToFavourites);
router.delete("/remove-from-favourites/:workerId", isUserAuthenticated, removeFromFavourites);

// User Reports
router.post("/report-user", isUserAuthenticated, reportUser);

export default router;
