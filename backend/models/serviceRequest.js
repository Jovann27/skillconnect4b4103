import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  typeOfWork: { type: String, required: true },
  time: { type: String, required: true },
  budget: { type: Number, default: 0 },
  notes: { type: String, default: ""},
  location: { type: { lat: Number, lng: Number }, default: null },
  status: { type: String, enum: ["Waiting", "Working", "Complete", "Cancelled"], default: "Waiting" },
  serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  targetProvider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  eta: { type: Date }, // Estimated time of arrival
  trackingId: { type: String, default: () => `REQ-${Date.now().toString(36)}` },
}, { timestamps: true });

serviceRequestSchema.index({ requester: 1, category: 1, status: 1 });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
