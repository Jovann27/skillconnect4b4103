import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import ServiceRequest from "../models/serviceRequest.js";
import Review from "../models/review.js";
import verificationAppointmentSchema from "../models/verificationSchema.js";
import { sendNotification } from "../utils/socketNotify.js";
import { sendTargetedRequestNotification } from "../utils/emailService.js";
import Booking from "../models/booking.js";
import Chat from "../models/chat.js";
import { io, onlineUsers } from "../server.js";
import cloudinary from "cloudinary";
import { checkAndUpdateExpiredRequests, getActiveRequestsFilter } from "../utils/expirationHandler.js";



export const applyProvider = catchAsyncError(async (req, res, next) => {
  const { skills, certificates } = req.body;

  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.isApplyingProvider = true;

  // Handle skills
  if (skills) {
    user.skills = Array.isArray(skills)
      ? skills
      : skills.toString().split(",").map(s => s.trim());
  }

  // Handle certificates
  if (certificates) {
    user.certificates = Array.isArray(certificates)
      ? certificates
      : [certificates];
  }

  // Assign temporary provider role (unverified)
  user.role = "Service Provider"; // ✅ no extra space

  await user.save();

  // Notify user
  await sendNotification(
    user._id,
    "Provider Application Received",
    "Your application to become a Service Provider was received. An admin will review it soon.",
    { type: "apply-provider" }
  );

  res.status(200).json({
    success: true,
    message: "Applied to become provider",
    user,
  });
});




export const postServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { name, address, phone, typeOfWork, preferredDate, time, budget, notes, location, targetProvider } = req.body;
  if (!name || !address || !phone || !typeOfWork || !time) return next(new ErrorHandler("Missing required fields", 400));

  // Calculate expiration date based on preferred date and time
  let expiresAt;
  if (preferredDate) {
    // Combine preferred date with time to create expiration datetime
    const [hours, minutes] = time.split(':').map(Number);
    const expirationDate = new Date(preferredDate);
    expirationDate.setHours(hours, minutes, 0, 0);
    expiresAt = expirationDate;
  } else {
    // Default to 24 hours from now if no preferred date
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const request = await ServiceRequest.create({
    requester: req.user._id,
    name,
    address,
    phone,
    typeOfWork,
    preferredDate: preferredDate || "",
    time,
    budget: budget || 0,
    notes,
    location: location || null,
    targetProvider,
    status: "Waiting",
    expiresAt,
  });

  // Find all providers whose skills match the service request
  // Send notification to all matching providers regardless of availability or budget
  const matchingProviders = await User.find({
    role: "Service Provider",
    skills: { $in: [new RegExp(typeOfWork, 'i')] }, // Match Service Needed against skills array
  }).select("_id");

  // Send notification to all matching providers
  for (const provider of matchingProviders) {
    await sendNotification(
      provider._id,
      "New Service Request",
      "Someone has posted a request that matches your service and skills.",
      { requestId: request._id, type: "service-request"}
    );
  }

  // Notify the requester that their request was posted
  await sendNotification(
    req.user._id,
    "Service Request Posted",
    `Your "${typeOfWork}" request has been posted successfully.`,
    { requestId: request._id, type: "service-request-posted"}
  );

  // Emit socket event for real-time updates (to relevant users only)
  // This could be improved by emitting to specific provider rooms

  res.status(201).json({ success: true, request });
});

export const updateBookingStatus = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;
  const { status } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  const allowed = ["Available", "Working", "Complete", "Cancelled"];
  if (!allowed.includes(status)) return next(new ErrorHandler("Invalid status", 400));

  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  booking.status = status;
  await booking.save();

  const otherUser = String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester;
  await sendNotification(otherUser, `Booking ${status}`, `Booking ${booking._id} status changed to ${status}`);

  // Emit socket event for real-time updates
  io.emit("booking-updated", { bookingId: booking._id, action: "status-updated", newStatus: status });

  res.json({ success: true, booking });
});



export const leaveReview = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { bookingId, rating, comments } = req.body;
  if (!bookingId || !rating) return next(new ErrorHandler("Missing required fields", 400));

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));
  if (booking.status !== "Complete") return next(new ErrorHandler("Booking not completed yet", 400));
  // Only participants can leave review (requester or provider)
  if (![String(booking.requester), String(booking.provider)].includes(String(req.user._id))) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  // Check if review already exists before creating
  const existing = await Review.findOne({
    booking: bookingId,
    reviewer: req.user._id,
  });
  if (existing) return next(new ErrorHandler("You already reviewed this booking", 400));

  const review = await Review.create({
    booking: booking._id,
    reviewer: req.user._id,
    reviewee: String(booking.requester) === String(req.user._id) ? booking.provider : booking.requester,
    rating,
    comments,
  });

  await sendNotification(review.reviewee, "New Review", `You received a ${rating}-star review.`);

  // Emit socket event for real-time updates
  io.emit("review-updated", { bookingId: booking._id, action: "review-added" });

  res.status(201).json({ success: true, review });
});




export const getServiceRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  // Get provider's details for matching
  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== "Service Provider") {
    return next(new ErrorHandler("Not a service provider", 403));
  }

  const providerSkills = provider.skills || [];
  const providerRate = provider.serviceRate || 0;
  const providerAvailability = provider.availability || "Not Available";

  // Only show requests if provider is available or currently working
  if (!["Available", "Currently Working"].includes(providerAvailability)) {
    return res.status(200).json({
      success: true,
      requests: [],
      message: "You must be available to view service requests."
    });
  }

  const tolerance = 200;
  const minBudget = providerRate - tolerance;
  const maxBudget = providerRate + tolerance;

  // First, let's see all available requests (filter out expired ones)
  const activeRequestsFilter = getActiveRequestsFilter();
  const allRequests = await ServiceRequest.find({
    ...activeRequestsFilter,
    status: "Waiting"
  })
    .populate({
      path: 'requester',
      select: 'firstName lastName username email phone',
      model: 'User'
    })
    .populate({
      path: 'serviceProvider',
      select: 'firstName lastName username email phone serviceRate',
      model: 'User'
    })
    .sort({ createdAt: -1 });

  // Filter requests based on Service Needed, Budget, and Time compatibility
  let filteredRequests = allRequests;

  if (providerSkills.length > 0) {
    filteredRequests = allRequests.filter(request => {
      // Check Service Needed compatibility
      const serviceCompatible = providerSkills.some(skill =>
        request.typeOfWork?.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(request.typeOfWork?.toLowerCase())
      );

      // Check Budget compatibility
      const budgetCompatible = request.budget >= minBudget && request.budget <= maxBudget;

      // Check Time compatibility - providers with "Available" status can handle any time,
      // providers with "Currently Working" can only handle flexible times
      let timeCompatible = false;
      if (providerAvailability === "Available") {
        timeCompatible = true; // Available providers can handle any time
      } else if (providerAvailability === "Currently Working") {
        // Currently working providers can only handle flexible times
        timeCompatible = ["ASAP", "Today", "Flexible"].some(flexibleTime =>
          request.time.toLowerCase().includes(flexibleTime.toLowerCase())
        );
      }

      return serviceCompatible && budgetCompatible && timeCompatible;
    });
  }

  // Also include requests specifically targeted to this provider (bypass normal matching)
  const targetedRequests = await ServiceRequest.find({
    status: "Waiting",
    targetProvider: req.user._id
  })
  .populate({
    path: 'requester',
    select: 'firstName lastName username email phone',
    model: 'User'
  })
  .populate({
    path: 'serviceProvider',
    select: 'firstName lastName username email phone serviceRate',
    model: 'User'
  })
  .sort({ createdAt: -1 });

  // Combine filtered requests with targeted requests (avoid duplicates)
  const targetedIds = targetedRequests.map(r => r._id.toString());
  const combinedRequests = [
    ...targetedRequests,
    ...filteredRequests.filter(r => !targetedIds.includes(r._id.toString()))
  ];

  // For testing purposes, if no requests match all criteria, return requests that at least match skills
  let finalRequests = combinedRequests;
  if (combinedRequests.length === 0 && allRequests.length > 0 && providerSkills.length > 0) {
    // Fallback to skill-only matching for better UX during testing
    const skillOnlyRequests = allRequests.filter(request => {
      return providerSkills.some(skill =>
        request.typeOfWork?.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(request.typeOfWork?.toLowerCase())
      );
    });
    finalRequests = skillOnlyRequests;
  }

  res.status(200).json({
    success: true,
    requests: finalRequests,
    debug: {
      totalRequests: finalRequests.length,
      allWaitingRequests: allRequests.length,
      filteredRequests: filteredRequests.length,
      targetedRequests: targetedRequests.length,
      userId: req.user._id,
      userRole: req.user.role,
      userSkills: providerSkills,
      providerRate,
      providerAvailability,
      budgetRange: { minBudget, maxBudget },
      sampleRequester: finalRequests[0]?.requester || null
    }
  });
});



export const getUserServiceRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const requests = await ServiceRequest.find({ requester: req.user._id })
    .populate('serviceProvider', 'firstName lastName username phone profilePic')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, requests });
});

export const getServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;

  // First check authorization without populate
  const requestCheck = await ServiceRequest.findById(id);
  if (!requestCheck) return next(new ErrorHandler("Service request not found", 404));

  // Check if user is authorized to view this request
  if (String(requestCheck.requester) !== String(req.user._id) &&
      String(requestCheck.serviceProvider) !== String(req.user._id) &&
      String(requestCheck.targetProvider) !== String(req.user._id) &&
      req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to view this request", 403));
  }

  // Now populate and return
  const request = await ServiceRequest.findById(id)
    .populate('requester', 'firstName lastName username email phone')
    .populate('serviceProvider', 'firstName lastName username email phone profilePic serviceRate')
    .populate('targetProvider', 'firstName lastName username');

  res.status(200).json({ success: true, request });
});

export const cancelServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;
  const { cancellationReason } = req.body;

  const request = await ServiceRequest.findById(id);
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  if (String(request.requester) !== String(req.user._id) && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to cancel this request", 403));
  }

  if(["Complete", "Cancelled"].includes(request.status)) {
    return next(new ErrorHandler("Cannot cancel a request that is already completed or cancelled", 400));
  }

  request.status = "Cancelled";
  request.cancellationReason = cancellationReason || "";
  await request.save();

  // Emit socket event for real-time updates
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "cancelled" });

  res.status(200).json({ success: true, request });
});


export const acceptServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));
  const { id } = req.params;
  const request = await ServiceRequest.findById(id).populate('requester');
  if (!request) return next(new ErrorHandler("Service Request not found", 404));
  if (request.status !== "Waiting") return next(new ErrorHandler("Request is not available", 400));

  // Ensure provider
  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== "Service Provider") return next(new ErrorHandler("Not a provider", 403));

  // Create booking
  const booking = await Booking.create({
    requester: request.requester._id,
    provider: provider._id,
    serviceRequest: request._id,
    status: "Working",
  });

  // Mark request working & set provider
  request.status = "Working";
  request.serviceProvider = provider._id;
  request.eta = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
  await request.save();

  // Notify requester
  await sendNotification(
    request.requester._id,
    "Request Accepted",
    `Your "${request.typeOfWork}" request has been accepted by ${provider.username}`,
    { date: booking.createdAt, service: request.typeOfWork }
  );

  // Emit socket events for real-time updates
  io.to(`service-request-${request._id}`).emit("service-request-updated", { requestId: request._id, action: "accepted" });
  io.emit("booking-updated", { bookingId: booking._id, action: "created" });

  res.status(201).json({ success: true, booking, request });
});

export const getBookings = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const bookings = await Booking.find({
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  }).populate('requester provider', 'firstName lastName')
    .populate('serviceRequest');

  res.status(200).json({ success: true, bookings });
});

export const getBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate('requester', 'firstName lastName username email phone profilePic')
    .populate('provider', 'firstName lastName username email phone profilePic')
    .populate('serviceRequest');

  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  // Check if user is authorized
  if (String(booking.requester) !== String(req.user._id) && String(booking.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized", 403));
  }

  res.status(200).json({ success: true, booking });
});



export const getServiceProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const serviceProfile = {
    service: user.service || '',
    rate: user.serviceRate || '',
    description: user.serviceDescription || '',
    isOnline: user.isOnline !== false // default to true if not set
  };

  res.status(200).json({ success: true, data: serviceProfile });
});

export const updateServiceProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { service, rate, description } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.service = service || user.service;
  user.serviceRate = rate || user.serviceRate;
  user.serviceDescription = description || user.serviceDescription;

  await user.save();

  res.status(200).json({ success: true, message: "Service profile updated", data: { service, rate, description } });
});

export const updateServiceStatus = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { isOnline } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.isOnline = isOnline;
  await user.save();

  res.status(200).json({ success: true, message: `Status updated to ${isOnline ? 'Online' : 'Offline'}` });
});

export const getMatchingRequests = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== "Service Provider") return next(new ErrorHandler("Not a provider", 403));
  if (!provider.isOnline) {
    return res.status(200).json({
      success: true,
      requests: [],
      message: "You are currently offline and cannot receive new requests."
    });
  }

  const providerRate = provider.serviceRate || 0;
  const providerSkills = provider.skills || [];
  const providerAvailability = provider.availability || "Not Available";

  // Only show requests if provider is available or currently working
  if (!["Available", "Currently Working"].includes(providerAvailability)) {
    return res.status(200).json({
      success: true,
      requests: [],
      message: "You must be available to receive matching requests."
    });
  }

  const tolerance = 200;
  const minBudget = providerRate - tolerance;
  const maxBudget = providerRate + tolerance;

  // First get requests that match Service Needed and Budget (filter out expired ones)
  const activeRequestsFilter = getActiveRequestsFilter();
  const skillAndBudgetMatchedRequests = await ServiceRequest.find({
    ...activeRequestsFilter,
    status: "Waiting",
    budget: { $gte: minBudget, $lte: maxBudget },
    typeOfWork: { $in: providerSkills.map(skill => new RegExp(skill, 'i')) } // Match against provider's skills
  })
  .populate({
    path: 'requester',
    select: 'firstName lastName username email phone',
    model: 'User'
  })
  .sort({ createdAt: -1 });

  // Now filter by Time compatibility
  const timeCompatibleRequests = skillAndBudgetMatchedRequests.filter(request => {
    // Check Time compatibility - providers with "Available" status can handle any time,
    // providers with "Currently Working" can only handle flexible times
    if (providerAvailability === "Available") {
      return true; // Available providers can handle any time
    } else if (providerAvailability === "Currently Working") {
      // Currently working providers can only handle flexible times
      return ["ASAP", "Today", "Flexible"].some(flexibleTime =>
        request.time.toLowerCase().includes(flexibleTime.toLowerCase())
      );
    }
    return false;
  });

  // Limit results to 10
  const requests = timeCompatibleRequests.slice(0, 10);

  res.status(200).json({
    success: true,
    requests,
    debug: {
      providerRate,
      providerSkills,
      providerAvailability,
      minBudget,
      maxBudget,
      totalRequests: requests.length,
      skillAndBudgetMatched: skillAndBudgetMatchedRequests.length,
      timeCompatible: timeCompatibleRequests.length,
      isOnline: provider.isOnline
    }
  });
});

export const getUserServices = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const user = await User.findById(req.user._id).select("services");
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.json({ success: true, services: user.services });
});

export const updateServiceRequest = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;

  const request = await ServiceRequest.findById(id);
  if (!request) return next(new ErrorHandler("Service request not found", 404));

  if (String(request.requester) !== String(req.user._id) && req.user.role !== "admin") {
    return next(new ErrorHandler("Not authorized to update this request", 403));
  }

  // Only allow updates if status is Waiting (before acceptance)
  if (request.status !== "Waiting") {
    return next(new ErrorHandler("Cannot edit request that is in progress", 400));
  }

  const { name, address, phone, typeOfWork, preferredDate, time, budget, notes, location } = req.body;

  request.name = name || request.name;
  request.address = address || request.address;
  request.phone = phone || request.phone;
  request.typeOfWork = typeOfWork || request.typeOfWork;
  request.preferredDate = preferredDate || request.preferredDate;
  request.time = time || request.time;
  request.budget = budget || request.budget;
  request.notes = notes || request.notes;
  request.location = location || request.location;

  // Recalculate expiration date if preferredDate or time was updated
  if (preferredDate || time) {
    let expiresAt;
    const dateToUse = preferredDate || request.preferredDate;
    const timeToUse = time || request.time;

    if (dateToUse) {
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const expirationDate = new Date(dateToUse);
      expirationDate.setHours(hours, minutes, 0, 0);
      expiresAt = expirationDate;
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    request.expiresAt = expiresAt;
  }

  await request.save();

  // Emit socket event for real-time updates
  io.emit("service-request-updated", { requestId: request._id, action: "updated" });

  res.status(200).json({ success: true, request });
});

export const getChatHistory = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const userId = req.user._id;

  // Find bookings where the user is involved (as requester or provider)
  const bookings = await Booking.find({
    $or: [
      { requester: userId },
      { provider: userId }
    ]
  }).select('_id');

  const bookingIds = bookings.map(b => b._id);

  // Fetch chats for these bookings
  const chats = await Chat.find({
    appointment: { $in: bookingIds }
  })
  .populate('sender', 'firstName lastName')
  .populate('appointment', 'requester provider')
  .sort({ createdAt: 1 }); // Sort by time ascending

  // Group chats by appointment for easier display
  const chatHistory = chats.reduce((acc, chat) => {
    const appointmentId = chat.appointment._id.toString();
    if (!acc[appointmentId]) {
      acc[appointmentId] = {
        appointmentId,
        participants: {
          requester: chat.appointment.requester,
          provider: chat.appointment.provider
        },
        messages: []
      };
    }
    acc[appointmentId].messages.push({
      id: chat._id,
      sender: chat.sender,
      message: chat.message,
      timestamp: chat.createdAt,
      status: chat.status,
      seenBy: chat.seenBy
    });
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    chatHistory: Object.values(chatHistory)
  });
});

export const sendMessage = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId, message } = req.body;
  if (!appointmentId || !message) {
    return next(new ErrorHandler("Appointment ID and message are required", 400));
  }

  // Verify user has access to this appointment
  const booking = await Booking.findOne({
    _id: appointmentId,
    $or: [
      { requester: req.user._id },
      { provider: req.user._id }
    ]
  });

  if (!booking) {
    return next(new ErrorHandler("Access denied to this chat", 403));
  }

  // Save message to database
  const chatMessage = await Chat.create({
    appointment: appointmentId,
    sender: req.user._id,
    message: message.trim(),
    status: 'sent'
  });

  // Populate sender info
  await chatMessage.populate('sender', 'firstName lastName profilePic');

  // Emit socket event for real-time update
  io.to(`chat-${appointmentId}`).emit("new-message", chatMessage);

  // Send notification to other user if they're online
  const otherUserId = booking.requester.toString() === req.user._id.toString()
    ? booking.provider.toString()
    : booking.requester.toString();

  const otherSocketId = onlineUsers.get(otherUserId);
  if (otherSocketId) {
    io.to(otherSocketId).emit("message-notification", {
      appointmentId,
      message: chatMessage,
      from: req.user.firstName + " " + req.user.lastName
    });
  }

  res.status(201).json({
    success: true,
    message: chatMessage
  });
});

export const getChatList = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const userId = req.user._id;

  // Find bookings where the user is involved
  const bookings = await Booking.find({
    $or: [
      { requester: userId },
      { provider: userId }
    ]
  })
  .populate('requester', 'firstName lastName username email phone profilePic')
  .populate('provider', 'firstName lastName username email phone profilePic')
  .populate('serviceRequest', 'name typeOfWork')
  .sort({ updatedAt: -1 });

  // Get chat counts and last messages for each booking
  const chatList = await Promise.all(bookings.map(async (booking) => {
    const messageCount = await Chat.countDocuments({ appointment: booking._id });
    const lastMessage = await Chat.findOne({ appointment: booking._id })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 });

    const otherUser = booking.requester._id.toString() === userId.toString()
      ? booking.provider
      : booking.requester;

    return {
      appointmentId: booking._id,
      otherUser,
      serviceRequest: booking.serviceRequest,
      status: booking.status,
      canComplete: booking.provider.toString() === userId.toString() && booking.status === 'Working',
      lastMessage: lastMessage ? {
        message: lastMessage.message,
        sender: lastMessage.sender,
        timestamp: lastMessage.createdAt,
        status: lastMessage.status
      } : null,
      messageCount,
      unreadCount: await Chat.countDocuments({
        appointment: booking._id,
        sender: { $ne: userId },
        status: { $ne: 'seen' },
        'seenBy.user': { $ne: userId }
      })
    };
  }));

  res.status(200).json({
    success: true,
    chatList
  });
});

export const markMessagesAsSeen = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { appointmentId } = req.params;
  const userId = req.user._id;

  // Verify user has access to this appointment
  const booking = await Booking.findOne({
    _id: appointmentId,
    $or: [
      { requester: userId },
      { provider: userId }
    ]
  });

  if (!booking) {
    return next(new ErrorHandler("Access denied to this chat", 403));
  }

  // Update all messages in this chat that weren't sent by this user
  await Chat.updateMany(
    {
      appointment: appointmentId,
      sender: { $ne: userId },
      'seenBy.user': { $ne: userId }
    },
    {
      $addToSet: {
        seenBy: {
          user: userId,
          seenAt: new Date()
        }
      },
      status: 'seen'
    }
  );

  // Emit socket event to notify sender
  const messages = await Chat.find({
    appointment: appointmentId,
    sender: { $ne: userId }
  }).populate('sender');

  messages.forEach(async (message) => {
    if (message.sender._id.toString() !== userId.toString()) {
      const senderSocketId = onlineUsers.get(message.sender._id.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-seen-update", {
          messageId: message._id,
          seenBy: req.user.firstName + " " + req.user.lastName,
          appointmentId
        });
      }
    }
  });

  res.status(200).json({
    success: true,
    message: "Messages marked as seen"
  });
});

export const getServiceProviders = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  try {
    const { typeOfWork, budget, limit } = req.query;

    // Build query with base filters for service providers (including inactive/offline)
    let query = {
      role: "Service Provider",
      banned: { $ne: true }
    };

    // Apply service type filter if provided
    if (typeOfWork) {
      // Normalize skills for matching
      const searchSkills = typeOfWork.toLowerCase().split(/\s+/).filter(word => word.length > 2);

      // Build skills match condition
      const skillMatchConditions = searchSkills.map(word => ({
        skills: {
          $elemMatch: {
            $regex: word,
            $options: 'i'
          }
        }
      }));

      query.$or = skillMatchConditions;
    }

    // Apply budget filter if provided
    if (budget) {
      const budgetNum = parseFloat(budget);
      if (!isNaN(budgetNum)) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { serviceRate: { $exists: false } },
            { serviceRate: null },
            {
              serviceRate: {
                $gte: budgetNum - 200,
                $lte: budgetNum + 200
              }
            }
          ]
        });
      }
    }

    let workersQuery = User.find(query)
      .select("firstName lastName skills availability profilePic service serviceRate serviceDescription createdAt certificates services isOnline")
      .sort({ createdAt: -1 });

    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        workersQuery = workersQuery.limit(limitNum);
      }
    }

    const workers = await workersQuery;

    res.json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export const notifyProvider = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { providerId, requestId, message } = req.body;

  if (!providerId || !requestId || !message) {
    return next(new ErrorHandler("Provider ID, request ID, and message are required", 400));
  }

  try {
    // Verify the request belongs to the user
    const request = await ServiceRequest.findById(requestId).populate('requester', 'firstName lastName');
    if (!request || String(request.requester) !== String(req.user._id)) {
      return next(new ErrorHandler("Request not found or not authorized", 404));
    }

    // Get provider details
    const provider = await User.findById(providerId).select('firstName lastName email');
    if (!provider) {
      return next(new ErrorHandler("Provider not found", 404));
    }

    // Send in-app notification to the provider
    await sendNotification(
      providerId,
      "Targeted Service Request",
      message,
      { requestId, type: "targeted-service-request" }
    );

    // Send email notification if provider has email
    if (provider.email) {
      try {
        await sendTargetedRequestNotification(
          provider.email,
          `${provider.firstName} ${provider.lastName}`,
          `${request.requester.firstName} ${request.requester.lastName}`,
          request.typeOfWork,
          requestId
        );
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
        // Don't fail the whole request if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Notification sent to provider"
    });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ success: false, message: "Failed to send notification" });
  }
});

export const completeBooking = catchAsyncError(async (req, res, next) => {
  if (!req.user) return next(new ErrorHandler("Unauthorized", 401));

  const { id } = req.params;
  const { comment } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) return next(new ErrorHandler("Booking not found", 404));

  // Only the provider can complete the booking
  if (String(booking.provider) !== String(req.user._id)) {
    return next(new ErrorHandler("Not authorized to complete this booking", 403));
  }

  if (booking.status !== "Working") {
    return next(new ErrorHandler("Booking is not in working status", 400));
  }

  // Handle proof images upload
  let proofImageUrls = [];
  if (req.files && req.files.proofImages) {
    const files = Array.isArray(req.files.proofImages) ? req.files.proofImages : [req.files.proofImages];
    for (const file of files) {
      const url = await uploadToCloudinary(file.tempFilePath, "skillconnect/proof-images");
      proofImageUrls.push(url);
    }
  }

  // Update booking
  booking.status = "Complete";
  booking.proofImages = proofImageUrls;
  booking.proofComment = comment || null;
  await booking.save();

  // Update the associated service request status
  const serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
  if (serviceRequest) {
    serviceRequest.status = "Complete";
    await serviceRequest.save();
  }

  // Notify the requester
  await sendNotification(
    booking.requester,
    "Service Completed",
    `Your service has been completed. Please review and rate the provider.`,
    { bookingId: booking._id, type: "service-completed" }
  );

  // Emit socket event for real-time updates
  io.emit("booking-updated", { bookingId: booking._id, action: "status-updated", newStatus: "Complete" });

  res.json({ success: true, booking });
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (filePath, folder) => {
  const result = await cloudinary.v2.uploader.upload(filePath, { folder });
  return result.secure_url;
};

export const reverseGeocode = catchAsyncError(async (req, res, next) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return next(new ErrorHandler("Latitude and longitude are required", 400));
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SkillConnect/1.0 (contact@skillconnect.com)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding service returned ${response.status}`);
    }

    const data = await response.json();
    res.json({ success: true, address: data.display_name || null });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    res.json({ success: false, address: null, error: error.message });
  }
});
