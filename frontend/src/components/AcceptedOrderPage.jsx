import { useState, useEffect } from "react";
import api from "../api";
import socket from "../utils/socket";
import "./SkilledUSer/WaitingForWorker.css";

const AcceptedOrderPage = ({ requestData }) => {
  const [workerData, setWorkerData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);

  useEffect(() => {
    if (!requestData) return;

    setCurrentRequest(requestData);

    // Populate worker data since request is accepted
    setWorkerData({
      name:
        requestData.serviceProvider
          ? `${requestData.serviceProvider.firstName} ${requestData.serviceProvider.lastName}`
          : "Worker",
      skill: requestData.typeOfWork || "Service",
      phone: requestData.serviceProvider?.phone || "09123456789",
      image: requestData.serviceProvider?.profilePic || "/default-profile.png",
      eta: requestData.eta || null,
    });

    // Join room for updates
    socket.emit("join-service-request", requestData._id);

    // Handle socket updates
    const handleUpdate = async (data) => {
      if (data.requestId !== requestData._id) return;

      try {
        const response = await api.get(`/user/service-request/${requestData._id}`);
        const updatedRequest = response.data.request;
        setCurrentRequest(updatedRequest);

        // Update worker data if changed
        setWorkerData({
          name:
            updatedRequest.serviceProvider
              ? `${updatedRequest.serviceProvider.firstName} ${updatedRequest.serviceProvider.lastName}`
              : "Worker",
          skill: updatedRequest.typeOfWork || "Service",
          phone: updatedRequest.serviceProvider?.phone || "09123456789",
          image:
            updatedRequest.serviceProvider?.profilePic ||
            "/default-profile.png",
          eta: updatedRequest.eta || null,
        });
      } catch (err) {
        console.error("Failed to update request:", err);
      }
    };

    socket.on("service-request-updated", handleUpdate);

    return () => {
      socket.off("service-request-updated", handleUpdate);
    };
  }, [requestData]);

  const customerDetails = [
    { label: "Name", value: currentRequest?.name || "N/A" },
    { label: "Address", value: currentRequest?.address || "N/A" },
    { label: "Phone", value: currentRequest?.phone || "N/A" },
  ];

  const orderDetails = [
    { label: "Service Type", value: currentRequest?.typeOfWork || "N/A" },
    {
      label: "Priority",
      value: currentRequest?.targetProvider ? "Favorite Worker" : "Any Available",
    },
    { label: "Budget", value: `₱${currentRequest?.budget || "N/A"}` },
    {
      label: "Date",
      value: currentRequest?.createdAt
        ? new Date(currentRequest.createdAt).toLocaleDateString()
        : "N/A",
    },
    { label: "Note", value: currentRequest?.notes || "None" },
  ];

  return (
    <div className="tab-screen-container">
      <div className="tab-screen-content">
        <div className="popup-body">
          {/* Header */}
          <div className="accepted-order-header">
            <h1 className="header-title">Order Accepted</h1>
            <p className="header-subtitle">
              Request #{currentRequest?._id?.slice(-8) || "N/A"}
            </p>

            <span className="status-badge available">
              Worker Assigned
            </span>
          </div>

          {/* Worker Details */}
          {workerData && (
            <div className="content-card worker-card">
              <h2 className="section-header">Your Assigned Worker</h2>
              <div className="worker-content">
                <img
                  src={workerData.image}
                  alt="Worker"
                  className="worker-avatar"
                />
                <div className="worker-info">
                  <h3>{workerData.name}</h3>
                  <p className="worker-detail">{workerData.skill}</p>
                  <p className="worker-detail">{workerData.phone}</p>
                  {workerData.eta && (
                    <p className="worker-detail">
                      ETA:{" "}
                      {new Date(workerData.eta).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="content-card">
            <h2 className="section-header">Service Location</h2>
            <div className="info-grid">
              {customerDetails.map((item, index) => (
                <div key={index} className="info-item">
                  <div className="info-label">{item.label}</div>
                  <div className="info-value">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div className="content-card">
            <h2 className="section-header">Service Details</h2>
            <div className="order-details-grid">
              {orderDetails.map((item, index) => (
                <div key={index} className="detail-row">
                  <span className="detail-label">{item.label}</span>
                  <span className="detail-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="popup-actions">
            {workerData && (
              <>
                <button
                  className="action-button chat-button"
                  onClick={() => window.open(`tel:${workerData.phone}`)}
                >
                  📞 Call Worker
                </button>

                <button className="action-button chat-button">
                  💬 Chat with Worker
                </button>
              </>
            )}

            <button className="action-button cancel-button">
              ❌ Cancel Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptedOrderPage;
