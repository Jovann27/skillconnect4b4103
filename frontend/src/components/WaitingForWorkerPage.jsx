import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import socket from "../utils/socket";
import "./SkilledUSer/WaitingForWorker.css";

const WaitingForWorkerPage = ({ requestData }) => {
  const location = useLocation();
  const data = requestData || location.state?.requestData;
  const [status, setStatus] = useState("Searching");
  const [workerData, setWorkerData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [matchedProviders, setMatchedProviders] = useState([]);
  const [providerReviews, setProviderReviews] = useState({});
  const [providerStats, setProviderStats] = useState({});
  const [offeringTo, setOfferingTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch matched providers
  const fetchMatchedProviders = async (request) => {
    if (!request || !request.typeOfWork || !request.budget) {
      console.warn("Request data incomplete for provider matching");
      return;
    }

    try {
      const response = await api.get('/user/service-providers');
      const allProviders = response.data?.workers || [];

      if (!Array.isArray(allProviders)) {
        console.error("Invalid providers data format");
        return;
      }

      // Filter providers based on request criteria
      const matched = allProviders.filter(provider => {
        if (!provider || !provider.skills || !Array.isArray(provider.skills)) {
          return false;
        }

        // Check if provider has matching skills
        const hasMatchingSkill = provider.skills.some(skill =>
          skill && typeof skill === 'string' &&
          (skill.toLowerCase().includes(request.typeOfWork.toLowerCase()) ||
           request.typeOfWork.toLowerCase().includes(skill.toLowerCase()))
        );

        // Check budget compatibility (within 200 tolerance)
        const providerRate = provider.serviceRate || 0;
        const tolerance = 200;
        const minBudget = providerRate - tolerance;
        const maxBudget = providerRate + tolerance;
        const budgetMatch = request.budget >= minBudget && request.budget <= maxBudget;

        return hasMatchingSkill && budgetMatch;
      });

      setMatchedProviders(matched);
    } catch (err) {
      console.error("Failed to fetch matched providers:", err);
      setMatchedProviders([]); // Set empty array on error
    }
  };

  // Fetch reviews and stats for providers
  const fetchProviderData = async (providers) => {
    if (!Array.isArray(providers) || providers.length === 0) {
      console.warn("No providers to fetch data for");
      return;
    }

    const reviews = {};
    const stats = {};

    // Process providers in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (provider) => {
          if (!provider || !provider._id) {
            console.warn("Invalid provider data:", provider);
            return;
          }

          try {
            // Fetch review stats
            const statsResponse = await api.get(`/reviews/stats/${provider._id}`);
            stats[provider._id] = statsResponse.data?.stats || { totalReviews: 0, averageRating: 0 };

            // Fetch recent reviews (limit to 3)
            const reviewsResponse = await api.get(`/reviews/user/${provider._id}`);
            const reviewData = reviewsResponse.data?.reviews || [];
            reviews[provider._id] = Array.isArray(reviewData) ? reviewData.slice(0, 3) : [];
          } catch (err) {
            console.error(`Failed to fetch data for provider ${provider._id}:`, err);
            stats[provider._id] = { totalReviews: 0, averageRating: 0 };
            reviews[provider._id] = [];
          }
        })
      );
    }

    setProviderStats(stats);
    setProviderReviews(reviews);
  };

  // Offer request to specific provider
  const offerRequestToProvider = async (providerId) => {
    if (!currentRequest || !currentRequest._id) {
      console.error("No current request available");
      alert("Unable to process request. Please try again.");
      return;
    }

    if (!providerId) {
      console.error("No provider ID provided");
      alert("Invalid provider selection. Please try again.");
      return;
    }

    // Find provider details for confirmation message
    const selectedProvider = matchedProviders.find(p => p._id === providerId);
    if (!selectedProvider) {
      console.error("Provider not found in matched providers list");
      alert("Provider not found. Please refresh and try again.");
      return;
    }

    setOfferingTo(providerId);

    try {
      // Update the service request with target provider
      const updateResponse = await api.put(`/user/service-request/${currentRequest._id}/update`, {
        targetProvider: providerId
      });

      if (!updateResponse.data || !updateResponse.data.success) {
        throw new Error("Failed to update service request");
      }

      // Send notification to the provider
      const notifyResponse = await api.post('/user/notify-provider', {
        providerId,
        requestId: currentRequest._id,
        message: `You have received a targeted service request for "${currentRequest.typeOfWork || 'service'}"`
      });

      // Show success message
      const providerName = `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim();
      alert(`Request successfully offered to ${providerName || 'the selected provider'}!`);

      // Optionally refresh the request data
      try {
        const refreshResponse = await api.get(`/user/service-request/${currentRequest._id}`);
        if (refreshResponse.data?.request) {
          setCurrentRequest(refreshResponse.data.request);
        }
      } catch (refreshErr) {
        console.warn("Failed to refresh request data:", refreshErr);
      }

    } catch (err) {
      console.error("Failed to offer request:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to offer request";
      alert(`${errorMessage}. Please try again.`);
    } finally {
      setOfferingTo(null);
    }
  };

  useEffect(() => {
    if (!data) {
      setError("No request data available");
      setIsLoading(false);
      return;
    }

    const initializeComponent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setCurrentRequest(data);

        // Fetch matched providers
        await fetchMatchedProviders(data);

        // If already working, populate worker
        if (data.status === "Working") {
          setStatus("Found");
          setWorkerData({
            name:
              data.serviceProvider
                ? `${data.serviceProvider.firstName} ${data.serviceProvider.lastName}`
                : "Worker",
            skill: data.typeOfWork || "Service",
            phone: data.serviceProvider?.phone || "09123456789",
            image: data.serviceProvider?.profilePic || "/default-profile.png",
            eta: data.eta || null,
          });
        }

        // Join room for real-time updates
        if (socket && data._id) {
          socket.emit("join-service-request", data._id);

          // Handle socket updates
          const handleUpdate = async (updateData) => {
            if (!updateData || updateData.requestId !== data._id) return;

            console.log("Received socket update:", updateData);

            try {
              const response = await api.get(`/user/service-request/${data._id}`);
              const updatedRequest = response.data?.request;

              if (updatedRequest) {
                setCurrentRequest(updatedRequest);

                // Update status based on request status
                if (updatedRequest.status === "Working" || updatedRequest.status === "Completed") {
                  setStatus("Found");

                  // Update worker data if provider is assigned
                  if (updatedRequest.serviceProvider) {
                    setWorkerData({
                      name: `${updatedRequest.serviceProvider.firstName || ''} ${updatedRequest.serviceProvider.lastName || ''}`.trim() || "Worker",
                      skill: updatedRequest.typeOfWork || "Service",
                      phone: updatedRequest.serviceProvider.phone || "09123456789",
                      image: updatedRequest.serviceProvider.profilePic || "/default-profile.png",
                      eta: updatedRequest.eta || null,
                    });
                  }
                } else if (updatedRequest.status === "Pending") {
                  setStatus("Searching");
                }

                // Refresh providers list if needed
                if (updateData.action === "provider-unavailable" || updateData.action === "new-provider") {
                  fetchMatchedProviders(updatedRequest);
                }
              }
            } catch (err) {
              console.error("Failed to update request via socket:", err);
            }
          };

          socket.on("service-request-updated", handleUpdate);

          return () => {
            if (socket) {
              socket.off("service-request-updated", handleUpdate);
              socket.emit("leave-service-request", data._id);
            }
          };
        }
      } catch (err) {
        console.error("Failed to initialize component:", err);
        setError("Failed to load request data. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [data]);

  // Fetch provider data when matched providers change
  useEffect(() => {
    if (matchedProviders.length > 0) {
      fetchProviderData(matchedProviders);
    }
  }, [matchedProviders]);

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="tab-screen-container">
        <div className="tab-screen-content">
          <div className="popup-body">
            <div className="waiting-section">
              <div className="pulse-circle">
                <span className="location-icon">⏳</span>
              </div>
              <h3>Loading your request...</h3>
              <p>Please wait while we prepare your service request.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="tab-screen-container">
        <div className="tab-screen-content">
          <div className="popup-body">
            <div className="content-card">
              <h2 className="section-header">❌ Error</h2>
              <p style={{ color: '#e53e3e', textAlign: 'center', padding: '20px' }}>
                {error}
              </p>
              <div className="popup-actions">
                <button
                  className="action-button chat-button"
                  onClick={() => window.location.reload()}
                >
                  🔄 Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-screen-container">
      <div className="tab-screen-content">
        <div className="popup-body">
          {/* Header */}
          <div className="accepted-order-header">
            <h1 className="header-title">Find Your Service Provider</h1>
            <p className="header-subtitle">
              Request #{currentRequest?._id?.slice(-8) || "N/A"}
            </p>

            <span
              className={`status-badge ${
                status === "Found" ? "available" :
                currentRequest?.status === "No Longer Available" ? "expired" : "searching"
              }`}
            >
              {status === "Found" ? "Provider Assigned" :
               currentRequest?.status === "No Longer Available" ? "No Longer Available" : "Finding Matches"}
            </span>
          </div>

          {/* My Request Details */}
          <div className="content-card request-details-card">
            <h2 className="section-header">📋 My Request Details</h2>
            <div className="request-details-grid">
              <div className="request-detail-item">
                <span className="detail-label">Needed by:</span>
                <span className="detail-value">
                  {currentRequest?.expiresAt
                    ? new Date(currentRequest.expiresAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="request-detail-item">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{currentRequest?.address || "N/A"}</span>
              </div>
              <div className="request-detail-item">
                <span className="detail-label">Notes:</span>
                <span className="detail-value">{currentRequest?.notes || "No additional details"}</span>
              </div>
            </div>
          </div>

          {/* Worker Found */}
          {status === "Found" && workerData && (
            <div className="content-card worker-assigned-card">
              <h2 className="section-header">✅ Provider Assigned</h2>
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

          {/* Matched Providers List - Always Visible */}
          <div className="content-card providers-list-section">
            <div className="providers-list-header">
              <h2 className="section-header">
                {status === "Found" ? "📋 Other Available Providers" : "🎯 Matched Providers"}
              </h2>
              <div className="providers-count">
                {matchedProviders.length > 0 ? (
                  <span className="count-badge">{matchedProviders.length} provider{matchedProviders.length !== 1 ? 's' : ''} found</span>
                ) : (
                  <span className="count-badge searching">Searching...</span>
                )}
              </div>
            </div>

            {matchedProviders.length > 0 ? (
              <div className="providers-column-list">
                {matchedProviders.map((provider) => {
                  const stats = providerStats[provider._id] || { totalReviews: 0, averageRating: 0 };
                  const reviews = providerReviews[provider._id] || [];
                  const experience = provider.createdAt ? Math.floor((new Date() - new Date(provider.createdAt)) / (1000 * 60 * 60 * 24 * 365)) : 0;

                  return (
                    <div key={provider._id} className="provider-column-card">
                      <div className="provider-column-header">
                        <img
                          src={provider.profilePic || "/default-profile.png"}
                          alt={`${provider.firstName} ${provider.lastName}`}
                          className="provider-column-avatar"
                        />
                        <div className="provider-column-info">
                          <h4 className="provider-column-name">{`${provider.firstName} ${provider.lastName}`}</h4>
                          <div className="provider-column-rating">
                            <span className="rating-stars">
                              {"★".repeat(Math.round(stats.averageRating))}{"☆".repeat(5 - Math.round(stats.averageRating))}
                            </span>
                            <span className="rating-score">{stats.averageRating.toFixed(1)}</span>
                            <span className="review-count">({stats.totalReviews} reviews)</span>
                          </div>
                          <div className="provider-column-meta">
                            <span className="meta-item">💰 ₱{provider.serviceRate || "N/A"}</span>
                            <span className={`meta-item status ${provider.isOnline ? 'online' : 'offline'}`}>
                              ● {provider.isOnline ? 'Online' : 'Offline'}
                            </span>
                            <span className="meta-item">📅 {experience} years</span>
                          </div>
                        </div>
                        <div className="provider-column-actions">
                          <button
                            className="offer-button"
                            onClick={() => offerRequestToProvider(provider._id)}
                            disabled={offeringTo === provider._id || status === "Found"}
                          >
                            {offeringTo === provider._id ? "Offering..." :
                             status === "Found" ? "📞 Contact Provider" : "🎯 Offer Request"}
                          </button>
                        </div>
                      </div>

                      <div className="provider-column-details">
                        {/* Skills & Services */}
                        <div className="detail-column-group">
                          <h5 className="detail-column-title">🛠️ Skills & Services</h5>
                          <p className="provider-skills">
                            {provider.skills?.join(", ") || "No skills listed"}
                          </p>
                          {provider.services && provider.services.length > 0 && (
                            <div className="provider-services">
                              <ul>
                                {provider.services.map((service, idx) => (
                                  <li key={idx}>
                                    {service.name} - ₱{service.rate} ({service.description})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* About Provider */}
                        <div className="detail-column-group">
                          <h5 className="detail-column-title">📋 About Provider</h5>
                          <p className="provider-description">
                            {provider.serviceDescription || "No description available"}
                          </p>
                          {provider.certificates && provider.certificates.length > 0 && (
                            <p className="provider-certificates">
                              <strong>Certificates:</strong> {provider.certificates.join(", ")}
                            </p>
                          )}
                        </div>

                        {/* Reviews */}
                        {reviews.length > 0 && (
                          <div className="detail-column-group">
                            <h5 className="detail-column-title">⭐ Recent Reviews</h5>
                            <div className="reviews-column-list">
                              {reviews.map((review, idx) => (
                                <div key={idx} className="review-column-item">
                                  <div className="review-column-header">
                                    <span className="review-rating">{"★".repeat(review.rating)}</span>
                                    <span className="review-client">{review.clientName}</span>
                                    <span className="review-date">
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="review-comment">{review.comment}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="waiting-section">
                <div className="pulse-circle">
                  <span className="location-icon">🔍</span>
                </div>
                <h3>Finding the perfect providers for you...</h3>
                <p>We're matching your request with skilled professionals in your area.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="popup-actions">
            {status === "Found" && (
              <>
                <button
                  className="action-button chat-button"
                  onClick={() => window.open(`tel:${workerData.phone}`)}
                >
                  📞 Call Provider
                </button>

                <button className="action-button chat-button">
                  💬 Chat with Provider
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

export default WaitingForWorkerPage;
