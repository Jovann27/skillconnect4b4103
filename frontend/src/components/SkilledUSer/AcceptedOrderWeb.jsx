import React, { useState } from "react";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import { usePopup } from "../../components/Layout/PopupContext";
import "./AcceptedOrderWeb.css";

const AcceptedOrderWeb = ({ request, isOpen, onClose }) => {
  const { openChat, user } = useMainContext();
  const { showNotification } = usePopup();
  const [workProofImage, setWorkProofImage] = useState(null);
  const [completingWork, setCompletingWork] = useState(false);

  if (!isOpen || !request) return null;

  const handleCancel = async () => {
    if (!request?._id) return;

    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const response = await api.delete(`/user/service-request/${request._id}/cancel`);
      if (response.data.success) {
        showNotification("Order cancelled successfully", "success", 3000, "Success");
        onClose();
      } else {
        showNotification("Failed to cancel the order. Please try again.", "error", 4000, "Error");
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
      showNotification("Failed to cancel the order. Please try again.", "error", 4000, "Error");
    }
  };

  const handleChat = async () => {
    if (request.serviceProvider) {
      try {
        // Find the booking associated with this request
        const response = await api.get("/user/bookings");
        const bookings = response.data.bookings || [];
        const booking = bookings.find(b => b.serviceRequest && b.serviceRequest._id === request._id);

        if (booking) {
          openChat(booking._id);
          showNotification(`Opening chat with ${request.serviceProvider.firstName}`, "success", 2000, "Success");
        } else {
          showNotification("No active booking found for this request.", "error", 3000, "Error");
        }
      } catch (err) {
        console.error("Error finding booking for chat:", err);
        showNotification("Failed to open chat. Please try again.", "error", 4000, "Error");
      }
    } else {
      showNotification("No service provider assigned for chat.", "info", 3000, "Info");
    }
  };

  const handleCompleteWork = async () => {
    if (!workProofImage) return;

    setCompletingWork(true);

    try {
      // Find the booking associated with this request
      const response = await api.get("/user/bookings");
      const bookings = response.data.bookings || [];
      const booking = bookings.find(b => b.serviceRequest && b.serviceRequest._id === request._id);

      if (!booking) {
        showNotification("No active booking found.", "error", 3000, "Error");
        return;
      }

      // For now, just complete the work without uploading image
      // TODO: Implement image upload
      const completeResponse = await api.put(`/user/booking/${booking._id}/status`, { status: "Complete" });

      if (completeResponse.data.success) {
        showNotification("Work completed successfully", "success", 3000, "Success");
        onClose();
      } else {
        showNotification("Failed to complete work.", "error", 3000, "Error");
      }
    } catch (err) {
      console.error("Error completing work:", err);
      showNotification("Failed to complete work.", "error", 3000, "Error");
    } finally {
      setCompletingWork(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const worker = request?.serviceProvider;
  const statusClass = request?.status?.toLowerCase() || 'accepted';

  // Check if current user is the provider who accepted this request
  const isProvider = user && worker && String(user._id) === String(worker._id);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content accepted-order-popup" onClick={(e) => e.stopPropagation()}>


        <div className="popup-body">
          {/* Header Section */}
          <div className="accepted-order-header">
            <h1 className="header-title">Service Order</h1>
            <p className="header-subtitle">Order #{request?._id?.slice(-8) || 'N/A'}</p>
            <span className={`status-badge ${statusClass}`}>
              {request?.status || "Accepted"}
            </span>
          </div>

          {/* Order Information */}
          <div className="content-card">
            <h2 className="section-header">Order Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Service Date</div>
                <div className="info-value">{formatDate(request?.createdAt)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Preferred Time</div>
                <div className="info-value">{request?.time || "N/A"}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Service Type</div>
                <div className="info-value">{request?.typeOfWork || "N/A"}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Budget</div>
                <div className="info-value budget">₱{request?.budget || "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="content-card">
            <h2 className="section-header">Customer Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Full Name</div>
                <div className="info-value">{request?.name || "N/A"}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Phone Number</div>
                <div className="info-value">{request?.phone || "N/A"}</div>
              </div>
            </div>
            <div className="info-item" style={{marginTop: '15px'}}>
              <div className="info-label">Service Address</div>
              <div className="info-value">{request?.address || "N/A"}</div>
            </div>
          </div>

          {/* Provider Details */}
          <div className="content-card">
            <h2 className="section-header">Provider Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Full Name</div>
                <div className="info-value">{worker?.firstName} {worker?.lastName}</div>
              </div>
              {isProvider && (
                <div className="info-item">
                  <div className="info-label">Phone Number</div>
                  <div className="info-value">{worker?.phone || "N/A"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="content-card">
            <h2 className="section-header">Additional Details</h2>

            {request?.notes && (
              <div className="notes-section">
                <span className="notes-label">Special Instructions</span>
                <div className="notes-content">{request.notes}</div>
              </div>
            )}
          </div>

          {/* Work Confirmation Section - Only show for service providers when status is Working */}
          {user?.role === 'Service Provider' && isProvider && request?.status === 'Working' && (
            <div className="work-confirmation-section">
              <h4>Complete Work</h4>
              <div className="work-confirmation-form">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setWorkProofImage(e.target.files[0])}
                  style={{ marginBottom: '10px' }}
                />
                <button
                  className="confirm-work-btn"
                  onClick={handleCompleteWork}
                  disabled={completingWork || !workProofImage}
                >
                  {completingWork ? 'Completing...' : 'Confirm Work Done'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="popup-actions">
            <button className="action-button chat-button" onClick={handleChat}>
              💬 Chat with Worker
            </button>
            <button className="action-button cancel-button" onClick={handleCancel}>
              ❌ Cancel Order
            </button>
            <button className="modal-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptedOrderWeb;
