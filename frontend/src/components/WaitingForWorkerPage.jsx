import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import socket from "../utils/socket";
import "./Css/WaitingForWorker.css";

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
    if (!request || !request.typeOfWork) return;
    try {
      const response = await api.get('/user/service-providers', {
        params: {
          typeOfWork: request.typeOfWork
        }
      });
      const matchedProviders = response.data?.workers || [];
      setMatchedProviders(matchedProviders);
    } catch (err) {
      console.error("Failed to fetch matched providers:", err);
      setMatchedProviders([]);
    }
  };

  // Fetch reviews and stats for providers
  const fetchProviderData = async (providers) => {
    if (!providers?.length) return;
    const reviews = {};
    const stats = {};
    const batchSize = 5;
    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);
      await Promise.all(batch.map(async (provider) => {
        if (!provider?._id) return;
        try {
          const statsResponse = await api.get(`/reviews/stats/${provider._id}`);
          stats[provider._id] = statsResponse.data?.stats || { totalReviews: 0, averageRating: 0 };
          const reviewsResponse = await api.get(`/reviews/user/${provider._id}`);
          const reviewData = reviewsResponse.data?.reviews || [];
          reviews[provider._id] = Array.isArray(reviewData) ? reviewData.slice(0, 3) : [];
        } catch (err) {
          stats[provider._id] = { totalReviews: 0, averageRating: 0 };
          reviews[provider._id] = [];
        }
      }));
    }
    setProviderStats(stats);
    setProviderReviews(reviews);
  };

  // Offer request to specific provider
  const offerRequestToProvider = async (providerId) => {
    if (!currentRequest?._id || !providerId) return alert("Unable to process request.");
    const selectedProvider = matchedProviders.find(p => p._id === providerId);
    if (!selectedProvider) return alert("Provider not found.");

    setOfferingTo(providerId);
    try {
      await api.put(`/user/service-request/${currentRequest._id}/update`, { targetProvider: providerId });
      await api.post('/user/notify-provider', {
        providerId,
        requestId: currentRequest._id,
        message: `You have a targeted request for "${currentRequest.typeOfWork || 'service'}"`
      });
      const providerName = `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim();
      alert(`Request offered to ${providerName || 'provider'}!`);
      const refreshResponse = await api.get(`/user/service-request/${currentRequest._id}`);
      if (refreshResponse.data?.request) setCurrentRequest(refreshResponse.data.request);
    } catch (err) {
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

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentRequest(data);
      await fetchMatchedProviders(data);
      if (data.status === "Working") {
        setStatus("Found");
        if (data.serviceProvider) {
            setWorkerData({
                name: `${data.serviceProvider.firstName} ${data.serviceProvider.lastName}`,
                skill: data.typeOfWork,
                phone: data.serviceProvider.phone,
                image: data.serviceProvider.profilePic || "/default-profile.png",
                eta: data.eta,
            });
        }
      }
      setIsLoading(false);
    };

    initialize();

    if (socket && data._id) {
      socket.emit("join-service-request", data._id);
      const handleUpdate = async (updateData) => {
        if (updateData?.requestId !== data._id) return;
        try {
          const response = await api.get(`/user/service-request/${data._id}`);
          const updatedRequest = response.data?.request;
          if (updatedRequest) {
            setCurrentRequest(updatedRequest);
            if (["Working", "Completed"].includes(updatedRequest.status)) {
              setStatus("Found");
              if (updatedRequest.serviceProvider) {
                setWorkerData({
                  name: `${updatedRequest.serviceProvider.firstName || ''} ${updatedRequest.serviceProvider.lastName || ''}`.trim(),
                  skill: updatedRequest.typeOfWork,
                  phone: updatedRequest.serviceProvider.phone,
                  image: updatedRequest.serviceProvider.profilePic || "/default-profile.png",
                  eta: updatedRequest.eta,
                });
              }
            } else if (updatedRequest.status === "Pending") {
              setStatus("Searching");
            }
          }
        } catch (err) {
          console.error("Failed to update request via socket:", err);
        }
      };
      socket.on("service-request-updated", handleUpdate);
      return () => {
        socket.off("service-request-updated", handleUpdate);
        socket.emit("leave-service-request", data._id);
      };
    }
  }, [data]);

  useEffect(() => {
    if (matchedProviders.length > 0) {
      fetchProviderData(matchedProviders);
    }
  }, [matchedProviders]);

  const renderStars = (rating) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  const getStatusBadgeClass = () => {
    if (status === "Found") return "status-found";
    if (currentRequest?.status === "No Longer Available") return "status-expired";
    return "status-searching";
  };

  const getStatusText = () => {
    if (status === "Found") return "Provider Found";
    if (currentRequest?.status === "No Longer Available") return "Expired";
    return "Searching";
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <h3>Loading your request</h3>
          <p>Please wait a moment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>🔄 Refresh Page</button>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="grid-layout">
          
          {/* LEFT COLUMN - Request Details & Cancel */}
          <div className="main-content">
            
            {/* Header Card */}
            <div className="card header-card">
              <div className="header-left">
                <h2>Finding Your Provider</h2>
                <p>Request #{currentRequest?._id?.slice(-6) || "N/A"}</p>
              </div>
              <div className={`status-badge ${getStatusBadgeClass()}`}>
                {getStatusText()}
              </div>
            </div>

            {/* Request Details */}
            <div className="card">
              <h3 className="card-title">Request Details</h3>
              <div className="details-grid">
                <div className="detail-row">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div className="detail-content">
                    <p>Needed by</p>
                    <p>{currentRequest?.expiresAt ? new Date(currentRequest.expiresAt).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
                <div className="detail-row">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <div className="detail-content">
                    <p>Location</p>
                    <p>{currentRequest?.address || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="detail-row detail-notes">
                <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div className="detail-content">
                  <p>Notes</p>
                  <p>{currentRequest?.notes || "None"}</p>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            {currentRequest?.status === "Pending" && (
              <button className="action-button action-cancel" onClick={() => {
                if (window.confirm("Are you sure you want to cancel this request?")) {
                  alert("Request cancelled");
                }
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Cancel Request
              </button>
            )}

          </div>

          {/* CENTER COLUMN - Assigned Provider & Providers List */}
          <div className="center-content">

            {/* Assigned Provider */}
            {status === "Found" && workerData && (
              <div className="card assigned-card">
                <div className="assigned-header">
                  <div className="assigned-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div className="assigned-info">
                    <h3>Provider Assigned</h3>
                    <p>Your service provider is on the way</p>
                  </div>
                </div>
                <div className="assigned-body">
                  <img src={workerData.image} alt={workerData.name} className="assigned-image" />
                  <div className="assigned-details">
                    <h4>{workerData.name}</h4>
                    <p>{workerData.skill}</p>
                    <p className="phone">{workerData.phone}</p>
                    {workerData.eta && <p>{new Date(workerData.eta).toLocaleTimeString()}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Providers List */}
            <div className="card">
              <h3 className="card-title">
                {status === "Found" ? "Other Available Providers" : `${matchedProviders.length} Matched Providers`}
              </h3>
              
              {matchedProviders.length > 0 ? (
                <div className="providers-list">
                  {matchedProviders.map((provider) => {
                    const stats = providerStats[provider._id] || { totalReviews: 0, averageRating: 0 };
                    const reviews = providerReviews[provider._id] || [];
                    return (
                      <div key={provider._id} className="provider-item">
                        <div className="provider-summary">
                          <img src={provider.profilePic || "/default-profile.png"} alt={`${provider.firstName} ${provider.lastName}`} className="provider-image" />
                          <div className="provider-info">
                            <h4>{provider.firstName} {provider.lastName}</h4>
                            <div className="provider-rating">
                              <span>{renderStars(stats.averageRating)}</span>
                              <span>({stats.totalReviews})</span>
                            </div>
                            <div className="provider-stats">
                              <span className="provider-price">₱{provider.serviceRate || "N/A"}</span>
                              <span className={`provider-status ${provider.isOnline ? "online" : "offline"}`}>
                                {provider.isOnline ? "● Online" : "● Offline"}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => offerRequestToProvider(provider._id)}
                            disabled={offeringTo === provider._id || status === "Found"}
                            className="provider-button"
                          >
                            {offeringTo === provider._id ? "Offering..." : status === "Found" ? "View" : "Offer"}
                          </button>
                        </div>
                        <div className="provider-details">
                          <div className="detail-section">
                            <div className="section-label">Skills</div>
                            <div className="section-text">{provider.skills?.join(", ") || "No skills listed"}</div>
                          </div>
                          <div className="detail-section">
                            <div className="section-label">About</div>
                            <div className="section-text">{provider.serviceDescription || "No description available"}</div>
                          </div>
                          {reviews.length > 0 && (
                            <div className="detail-section">
                              <div className="section-label">Recent Reviews</div>
                              <div className="reviews-list">
                                {reviews.map((review) => (
                                  <div key={review._id} className="review-item">
                                    <div className="review-author">{review.clientName}</div>
                                    <div className="review-text">{review.comment}</div>
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
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h4 className="empty-title">Finding providers</h4>
                  <p className="empty-text">We're matching your request with skilled professionals</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN - Actions */}
          <div className="sidebar">

              <div className="actions-card">
                {status === "Found" && (
                  <>
                    <button className="action-button action-call" onClick={() => window.open(`tel:${workerData.phone}`)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      Call Provider
                    </button>
                    <button className="action-button action-chat">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                      </svg>
                      Chat
                    </button>
                  </>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingForWorkerPage;
