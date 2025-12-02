import JobFair from "../models/jobFairSchema.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Booking from "../models/booking.js";
import ErrorHandler from "../middlewares/error.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { sendNotification } from "../utils/socketNotify.js";

// Create Job Fair
export const createJobFair = async (req, res) => {
  try {
    const { title, description, date, startTime,endTime, location } = req.body;

    const jobfair = await JobFair.create({
      title,
      description,
      date,
      startTime,
      endTime,
      location,
    });

    res.status(201).json({ success: true, jobfair });
  } catch (err) {
    console.error("createJobFair error", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all service requests
export const adminGetAllServiceRequests = async (req, res) => {
  try {
    const { skill, status, sort } = req.query;

    let filter = {};
    if (skill) {
      const regex = new RegExp(skill, 'i');

      // find users who have a matching skill via regex
      const usersWithSkill = await User.find({ skills: { $regex: regex } }).select("_id");
      const userIds = usersWithSkill.map(u => u._id);

      const orClauses = [{ title: regex }, { description: regex }];
      if (userIds.length) orClauses.push({ requester: { $in: userIds } });

      filter = { $or: orClauses };
    }

    if (status) {
      // normalize to capitalized enum
      const normalized = status[0].toUpperCase() + status.slice(1).toLowerCase();
      filter.status = normalized;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const requests = await ServiceRequest.find(filter)
      .populate('requester', 'firstName lastName profilePic')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalRequests = await ServiceRequest.countDocuments(filter);
    const totalPages = Math.ceil(totalRequests / limit);

    res.json({
      count: totalRequests,
      totalPages,
      requests,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Verify user
export const verifyUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  
  // Validate request
  if (!id) {
    return next(new ErrorHandler("User ID is required", 400));
  }
  
  if (!req.user || !req.user._id) {
    return next(new ErrorHandler("Admin authentication required", 401));
  }

  try {
    const user = await User.findById(id);

    if (!user) return next(new ErrorHandler("User not found", 404));
    if (user.verified) return next(new ErrorHandler("User is already verified", 400));

    user.verified = true;
    user.verifiedBy = req.user._id; // Admin who verified the user
    await user.save();

    console.log(`User ${id} verified successfully by admin ${req.user._id}`);

    // Send notification to the user (won't fail if socket not available)
    await sendNotification(
      user._id,
      "Account Verified",
      "Your account has been verified by an administrator. You can now log in to the system.",
      { type: "account-verified" }
    );

    res.status(200).json({
      success: true,
      message: `User (${user.firstName} ${user.lastName}) has been verified successfully`,
      user
    });
  } catch (error) {
    console.error("Error verifying user:", error.message, error.stack);
    return next(new ErrorHandler(`Failed to verify user: ${error.message}`, 500));
  }
});

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get service providers
export const getServiceProviders = async (req, res) => {
  try {
    const workers = await User.find({ role: "Service Provider" })
      .select("firstName lastName skills availability profilePic createdAt");
    res.json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve Service Provider (set availability to Available)
export const approveServiceProvider = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("User not found", 404));
  if (user.role !== "Service Provider") return next(new ErrorHandler("User is not a Service Provider", 400));

  user.availability = "Available"; // Set to available
  await user.save();

  res.status(200).json({
    success: true,
    message: `Service Provider (${user.firstName} ${user.lastName}) has been approved.`,
    user
  });
});

// Reject Service Provider (set availability to Not Available)
export const rejectServiceProvider = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler("User not found", 404));
  if (user.role !== "Service Provider") return next(new ErrorHandler("User is not a Service Provider", 400));

  user.availability = "Not Available"; // Set to not available
  await user.save();

  res.status(200).json({
    success: true,
    message: `Service Provider (${user.firstName} ${user.lastName}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
    user
  });
});

// Get Service Providers
export const getServiceProviderApplicants = catchAsyncError(async (req, res, next) => {
  const providers = await User.find({ role: "Service Provider" })
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: providers.length,
    providers
  });
});

//Ban User
export const banUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const user = await User.findById(id);

    if (!user) return next(new ErrorHandler("User not found", 404));
    if (user.role === "Admin") return next(new ErrorHandler("Cannot ban another admin", 403));
    if (user.banned) return next(new ErrorHandler("User is already banned", 400));

    user.availability = "Not Available";
    user.banned = true;
    await user.save();

    console.log(`User ${id} banned successfully`);

    // Send notification to banned user (won't fail if socket not available)
    await sendNotification(
      user._id,
      "Account Banned",
      "Your account has been banned by an administrator. Please contact support for more information.",
      { type: "account-banned" }
    );

    res.status(200).json({
      success: true,
      message: `User (${user.firstName} ${user.lastName}) has been banned successfully.`,
      user
    });
  } catch (error) {
    console.error("Error banning user:", error.message, error.stack);
    return next(new ErrorHandler(`Failed to ban user: ${error.message}`, 500));
  }
});

// Update user service profile
export const updateUserServiceProfile = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { services } = req.body;

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Validate services array
  if (!Array.isArray(services)) {
    return next(new ErrorHandler("Services must be an array", 400));
  }

  // Validate each service object
  for (const service of services) {
    if (!service.name || typeof service.name !== 'string' || service.name.trim() === '') {
      return next(new ErrorHandler("Each service must have a valid name", 400));
    }
    if (service.rate !== undefined && (typeof service.rate !== 'number' || service.rate < 0)) {
      return next(new ErrorHandler("Service rate must be a positive number", 400));
    }
  }

  // Update services array
  user.services = services.map(service => ({
    name: service.name.trim(),
    rate: service.rate || 0,
    description: service.description ? service.description.trim() : ''
  }));

  await user.save();

  res.status(200).json({
    success: true,
    message: "User service profile updated successfully",
    user: {
      _id: user._id,
      services: user.services
    }
  });
});

// Get dashboard metrics
export const getDashboardMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ role: "Service Provider" });
    const activeBookings = await Booking.countDocuments({ status: { $in: ["Pending", "Confirmed", "InProgress"] } });
    const totalBookings = await Booking.countDocuments();

    // Bookings per week (last 4 weeks)
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 28);
    const bookingsOverTime = await Booking.aggregate([
      { $match: { createdAt: { $gte: lastMonth } } },
      {
        $group: {
          _id: {
            week: { $isoWeek: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      { $limit: 4 },
    ]);

    // Most booked categories (assuming from service requests)
    const mostBooked = await ServiceRequest.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      metrics: {
        totalUsers,
        totalProviders,
        activeBookings,
        totalBookings,
        bookingsOverTime,
        mostBooked,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
