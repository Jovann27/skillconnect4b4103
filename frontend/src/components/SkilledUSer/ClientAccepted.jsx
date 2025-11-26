import React, { useState, useEffect } from 'react';
import { useMainContext } from '../../mainContext';
import api from '../../api';
import './ClientAccepted.css';

const ClientAccepted = ({ requestId }) => {
  const { user } = useMainContext();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [media, setMedia] = useState([]);

  // Fetch request data on component mount
  useEffect(() => {
    if (requestId) {
      fetchRequestData();
    } else {
      // If no requestId provided, fetch all accepted requests and use the first one
      fetchAcceptedRequests();
    }
  }, [requestId]);

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      // For now, we'll fetch all accepted requests and find the matching one
      const response = await api.get('/settings/my-accepted-requests');
      if (response.data.success) {
        const foundRequest = response.data.requests.find(req => req._id === requestId);
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          alert('Request not found');
          window.history.back();
        }
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      alert('Failed to load request data');
      window.history.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptedRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/my-accepted-requests');
      if (response.data.success && response.data.requests.length > 0) {
        setRequest(response.data.requests[0]); // Use the first/most recent request
      } else {
        alert('No active accepted requests found.');
        window.history.back();
      }
    } catch (error) {
      console.error('Error fetching accepted requests:', error);
      alert('Failed to load request data');
      window.history.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this service request?')) {
      window.history.back();
    }
  };

  const handleCall = () => {
    const phoneNumber = request?.requester?.phone || user?.phone || '09123456789';
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleChat = () => {
    // Navigate to chat - this would need to be implemented
    alert('Chat functionality will be implemented soon');
  };

  const pickMedia = () => {
    // Create a file input for media selection
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*';

    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      const selected = files.map(file => ({
        uri: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        file: file
      }));
      setMedia(prev => [...prev, ...selected]);
    };

    input.click();
  };

  const handleSubmitProof = async () => {
    if (media.length === 0) {
      alert('Please upload proof of work before completing the job.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.put(`/settings/complete-service-request/${request._id}`);

      if (response.data.success) {
        alert('Proof of work submitted and job completed successfully!');
        window.history.back();
      } else {
        alert('Failed to complete the job. Please try again.');
      }
    } catch (error) {
      console.error('Error completing service request:', error);
      alert('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="client-accepted-loading">
        <div className="loading-spinner"></div>
        <p>Loading request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="client-accepted-error">
        <p>No request data available</p>
      </div>
    );
  }

  return (
    <div className="client-accepted-container">
      {/* Service Provider Info Card (Current User) */}
      <div className="info-section">
        <div className="info-card">
          <div className="profile-row">
            <img
              src={user?.profilePic || '/default-profile.png'}
              alt="Your profile"
              className="profile-avatar"
            />
            <div className="profile-info">
              <h3 className="profile-name">{user?.firstName} {user?.lastName}</h3>
              <p className="profile-role">Service Provider</p>
              <p className="profile-status">Status: {request?.status || 'Working'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Info Card */}
      <div className="info-section">
        <h2 className="section-title">Client Details</h2>
        <div className="info-card">
          <div className="profile-row">
            <img
              src={request?.requester?.profilePic || '/default-profile.png'}
              alt="Client profile"
              className="profile-avatar"
            />
            <div className="profile-info">
              <h3 className="profile-name">
                {request?.requester?.firstName} {request?.requester?.lastName}
              </h3>
              <p className="profile-contact">{request?.requester?.email}</p>
              <p className="profile-contact">{request?.requester?.phone || 'Phone not provided'}</p>
            </div>

            {/* Chat & Call Buttons */}
            <div className="action-buttons">
              <button className="btn-call" onClick={handleCall}>
                <i className="fas fa-phone"></i>
                Call
              </button>
              <button className="btn-chat" onClick={handleChat}>
                <i className="fas fa-comments"></i>
                Chat
              </button>
            </div>
          </div>

          <div className="divider"></div>

          {/* Service Details */}
          <div className="service-details">
            <div className="detail-item">
              <i className="fas fa-briefcase detail-icon"></i>
              <span className="detail-label">Service Type:</span>
              <span className="detail-value">{request?.typeOfWork || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-money-bill-wave detail-icon"></i>
              <span className="detail-label">Budget:</span>
              <span className="detail-value">₱{request?.budget || 0}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-calendar-alt detail-icon"></i>
              <span className="detail-label">Date Created:</span>
              <span className="detail-value">
                {request?.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Not specified'}
              </span>
            </div>
            <div className="detail-item">
              <i className="fas fa-clock detail-icon"></i>
              <span className="detail-label">Preferred Time:</span>
              <span className="detail-value">{request?.time || 'Not specified'}</span>
            </div>
            <div className="detail-item">
              <i className="fas fa-chart-line detail-icon"></i>
              <span className="detail-label">Status:</span>
              <span className="detail-value">{request?.status || 'Working'}</span>
            </div>
          </div>

          {request?.notes && (
            <div className="notes-section">
              <h4>Client Notes</h4>
              <p>{request.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Proof of Work Upload Card */}
      <div className="info-section">
        <h2 className="section-title">Complete Service Request</h2>
        <div className="info-card">
          <p className="required-notice">
            Please upload proof of work before marking the job as completed.
          </p>

          <button
            className={`btn-upload ${submitting ? 'disabled' : ''}`}
            onClick={pickMedia}
            disabled={submitting}
          >
            <i className="fas fa-cloud-upload-alt"></i>
            Attach Photos/Videos
          </button>

          {media.length > 0 && (
            <div className="media-preview">
              {media.map((item, idx) => (
                <img
                  key={idx}
                  src={item.uri}
                  alt={`Proof ${idx + 1}`}
                  className="media-item"
                />
              ))}
            </div>
          )}

          <textarea
            className="comment-input"
            placeholder="Add completion notes (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
          />

          <button
            className={`btn-submit ${submitting ? 'disabled' : ''}`}
            onClick={handleSubmitProof}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Completing...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i>
                Complete Job
              </>
            )}
          </button>

          <button
            className={`btn-cancel ${submitting ? 'disabled' : ''}`}
            onClick={handleCancel}
            disabled={submitting}
          >
            <i className="fas fa-times"></i>
            Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientAccepted;
