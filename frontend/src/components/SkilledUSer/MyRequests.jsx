import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import socket from "../../utils/socket";
import WaitingForWorker from "./WaitingForWorker";

const MyRequests = ({
  searchTerm,
  filterStatus,
  filterServiceType,
  filterBudgetRange,
  handleRequestClick,
  handleChatRequest,
  handleEditRequest,
  handleCancelRequest,
  getStatusClass,
}) => {
  const navigate = useNavigate();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showWaiting, setShowWaiting] = useState(false);

  const fetchMyRequests = async () => {
    try {
      const { data } = await api.get("/user/user-service-requests", {
        withCredentials: true,
      });
      setMyRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching my requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();

    socket.on("service-request-updated", () => {
      fetchMyRequests();
    });

    return () => {
      socket.off("service-request-updated");
    };
  }, []);

  const normalizeStatus = (status) => {
    if (status === "Waiting") return "Available";
    if (status === "Completed") return "Complete";
    return status;
  };

  const safeLower = (value) =>
    value ? value.toString().toLowerCase() : "";

  const filteredMyRequests = myRequests.filter((request) => {
    const searchLower = searchTerm?.toLowerCase() || "";

    const matchesSearch =
      safeLower(request.typeOfWork).includes(searchLower) ||
      safeLower(request.name).includes(searchLower) ||
      safeLower(request.budget).includes(searchLower) ||
      safeLower(request.address).includes(searchLower) ||
      safeLower(request.phone).includes(searchLower) ||
      safeLower(request.notes).includes(searchLower);

    const normalizedStatus = normalizeStatus(request.status);

    const matchesStatus =
      filterStatus === "All" || normalizedStatus === filterStatus;

    const matchesServiceType =
      filterServiceType === "All" ||
      request.typeOfWork === filterServiceType;

    const matchesBudget =
      (!filterBudgetRange.min ||
        request.budget >= parseFloat(filterBudgetRange.min)) &&
      (!filterBudgetRange.max ||
        request.budget <= parseFloat(filterBudgetRange.max));

    return (
      matchesSearch && matchesStatus && matchesServiceType && matchesBudget
    );
  });

  const handleRowClick = (request) => {
    const normalized = normalizeStatus(request.status);

    if (normalized === "Available") {
      setSelectedRequest(request);
      setShowWaiting(true);
    } else {
      handleRequestClick(request);
    }
  };

  if (loading) return <div className="records-loading">Loading records...</div>;
  if (error) return <div className="records-error">{error}</div>;

  return (
    <>
      {filteredMyRequests.length === 0 ? (
        <div className="no-results">
          <img
            src="/records.png"
            alt="No results"
            style={{ width: 100, height: 100, opacity: 0.5, marginBottom: 10 }}
          />
          <p>No My Requests Found</p>
        </div>
      ) : (
        <table className="records-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Request Date</th>
              <th>Service Needed</th>
              <th>Budget</th>
              <th>Preferred Time</th>
              <th>Address</th>
            </tr>
          </thead>

          <tbody>
            {filteredMyRequests.map((request) => {
              const normalizedStatus = normalizeStatus(request.status);

              return (
                <tr
                  key={request._id}
                  className="request-row"
                  onClick={() => handleRowClick(request)}
                >
                  <td>
                    <span className={`status-tag ${getStatusClass(request.status)}`}>
                      {request.status === "Waiting"
                        ? "Pending"
                        : request.status === "Completed"
                        ? "Complete"
                        : request.status === "Open"
                        ? "Pending"
                        : request.status}
                    </span>
                  </td>

                  <td>
                    <div className="date">
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString()
                        : "-"}
                    </div>
                  </td>

                  <td>{request.typeOfWork}</td>
                  <td>₱{request.budget || "0"}</td>
                  <td>{request.time || "Not specified"}</td>
                  <td>{request.address || "Not specified"}</td>

                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showWaiting && (
        <WaitingForWorker
          isOpen={showWaiting}
          onClose={() => setShowWaiting(false)}
          requestData={selectedRequest}
        />
      )}
    </>
  );
};

export default MyRequests;
