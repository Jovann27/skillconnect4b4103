import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";
import Admin from "../models/adminSchema.js";

const getTokenFromRequest = (req) => {
  // Check for Bearer token in Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  // Use the standard token cookie for both users and admins
  return req.cookies?.token;
};

export const isUserAuthenticated = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ success: false, message: "Please login first (user)" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token (user)" });
    }

    if (!decoded || decoded.type !== "user") return res.status(401).json({ success: false, message: "Not a user token" });

    const user = await User.findById(decoded.id).select("+password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    if (user.banned) return res.status(403).json({ success: false, message: "Account is banned" });

    req.user = user;
    next();
  } catch (error) {
    console.error("User auth error:", error.message);
    return res.status(401).json({ success: false, message: "Authentication failed (user)" });
  }
};

export const isAdminAuthenticated = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ success: false, message: "Please login first (admin)" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token (admin)" });
    }

    if (!decoded || decoded.type !== "admin") return res.status(401).json({ success: false, message: "Not an admin token" });

    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ success: false, message: "Admin not found" });

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth error:", error.message);
    return res.status(401).json({ success: false, message: "Authentication failed (admin)" });
  }
};


// DEPRECATED: verified field removed from schema
// export const isUserVerified = (req, res, next) => {
//   if (req.user.verified) {
//     next();
//   } else {
//     return res.status(403).json({ success: false, message: "User not verified" });
//   }
// };
