import { useEffect, useState } from "react";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import socket from "../../utils/socket";

const AvailableRequests = ({ searchTerm, filterStatus, filterServiceType, filterBudgetRange, handleRequestClick, handleAcceptRequest, handleDeclineRequest, getStatusClass }) => {
  const { user } = useMainContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentRequests = async () => {
    try {
      const { data } = await api.get("/user/matching-requests", { withCredentials: true });
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRequests();

    socket.on("service-request-updated", (data) => {
      console.log("Service request updated:", data);
      fetchCurrentRequests();
    });

    return () => {
      socket.off("service-request-updated");
    };
  }, []);

  const filteredRequests = requests.filter((request) => {
    if (!request) {
      console.warn("Invalid request structure:", request);
      return false;
    }

    const isAvailableRequest = request.status === "Available" || request.status === "Waiting" || request.status === "Open";
    if (!isAvailableRequest) return false;

    // Exclude current user's own requests
    const isNotOwnRequest = request.requester?._id !== user._id && request.requesterId !== user._id;
    if (!isNotOwnRequest) {
      console.log("Excluding own request:", request._id, "Requester:", request.requester?._id, "Current user:", user._id);
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = request.typeOfWork?.toLowerCase().includes(searchLower) ||
                          request.requester?.firstName?.toLowerCase().includes(searchLower) ||
                          request.requester?.lastName?.toLowerCase().includes(searchLower) ||
                          request.name?.toLowerCase().includes(searchLower) ||
                          request.budget?.toString().includes(searchTerm) ||
                          request.address?.toLowerCase().includes(searchLower) ||
                          request.phone?.toLowerCase().includes(searchLower) ||
                          request.notes?.toLowerCase().includes(searchLower);
    const normalizedStatus = request.status === "Waiting" ? "Available" : request.status === "Completed" ? "Complete" : request.status;
    const matchesStatus = filterStatus === "All" || normalizedStatus === filterStatus;
    const matchesServiceType = filterServiceType === "All" || request.typeOfWork === filterServiceType;
    const matchesBudget = (!filterBudgetRange.min || request.budget >= parseFloat(filterBudgetRange.min)) &&
                         (!filterBudgetRange.max || request.budget <= parseFloat(filterBudgetRange.max));

    const result = isAvailableRequest && isNotOwnRequest && matchesSearch && matchesStatus && matchesServiceType && matchesBudget;
    if (result) {
      console.log("Request passed filter:", request._id, "Status:", request.status, "Not own request:", isNotOwnRequest);
    }
    return result;
  });

  if (loading) return <div className="records-loading">Loading records...</div>;
  if (error) return <div className="records-error">{error}</div>;

  // Role-based access is handled by RoleGuard in App.jsx and parent component (UserRecords)
  // The "available-requests" tab is only enabled for Service Providers

  return (
    <>
      {filteredRequests.length === 0 ? (
        <div className="no-results">
          <img src="/records.png" alt="No results" style={{width: 100, height: 100, opacity: 0.5, marginBottom: 10}} />
          <p>No Available Requests Found</p>
        </div>
      ) : (
        <table className="records-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Request Date</th>
              <th>Client</th>
              <th>Service Needed</th>
              <th>Budget</th>
              <th>Preferred Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr key={request._id} onClick={() => handleRequestClick(request)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className={`status-tag ${getStatusClass(request.status)}`}>
                    {request.status === "Waiting" ? "Available" : request.status === "Completed" ? "Complete" : request.status === "Open" ? "Available" : request.status}
                  </span>
                </td>
                <td>
                  <div className="date">
                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "-"}
                  </div>
                </td>
                <td>
                  {request.requester ?
                    `${request.requester.firstName || ""} ${request.requester.lastName || ""}`.trim() ||
                    request.requester.username ||
                    "Unknown Client" :
                    "N/A"
                  }
                </td>
                <td>{request.typeOfWork}</td>
                <td>₱{request.budget || "0"}</td>
                <td>{request.time || "Not specified"}</td>
                <td>
                  <div className="request-actions">
                    <button className="action-btn accept" onClick={(e) => { e.stopPropagation(); handleAcceptRequest(request, e); }}>Accept</button>
                    <button className="action-btn decline" onClick={(e) => { e.stopPropagation(); handleDeclineRequest(request, e); }}>Decline</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default AvailableRequests;
