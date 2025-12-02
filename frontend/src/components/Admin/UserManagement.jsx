import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import "./UserManagement.css";

const SERVICE_OPTIONS = [
  {
    name: "Plumbing",
    description: "Pipe installation, leak repair, and bathroom plumbing maintenance.",
    icon: "water-outline"
  },
  {
    name: "Electrical",
    description: "Wiring, lighting, and electrical appliance repair.",
    icon: "flash-outline"
  },
  {
    name: "Cleaning",
    description: "House cleaning, deep cleaning, and carpet or sofa cleaning.",
    icon: "broom-outline"
  },
  {
    name: "Carpentry",
    description: "Furniture repair, assembly, and custom woodwork.",
    icon: "construct-outline"
  },
  {
    name: "Painting",
    description: "Interior and exterior wall painting, color consultation.",
    icon: "color-palette-outline"
  },
  {
    name: "Appliance Repair",
    description: "Aircon, refrigerator, and washing machine maintenance.",
    icon: "build-outline"
  },
  {
    name: "Home Renovation",
    description: "Tile, flooring, roofing, and home improvement.",
    icon: "hammer-outline"
  },
  {
    name: "Pest Control",
    description: "Termite, rodent, and insect control for safer homes.",
    icon: "bug-outline"
  },
  {
    name: "Gardening & Landscaping",
    description: "Lawn care, plant maintenance, and landscape design.",
    icon: "leaf-outline"
  },
  {
    name: "Air Conditioning & Ventilation",
    description: "Aircon installation, cleaning, and HVAC servicing.",
    icon: "snow-outline"
  }
];

const UserManagement = () => {
  const { admin, isAuthorized, tokenType } = useMainContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("users");
  const [actionLoading, setActionLoading] = useState(null); // Track which action is loading
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [serviceFormData, setServiceFormData] = useState([]);

  const [showUserModal, setShowUserModal] = useState(false);
  const [newRegisteredUsers, setNewRegisteredUsers] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentType, setDocumentType] = useState(''); // 'validId' or 'certificate'

  // Check if user is authenticated as admin
  const isAdmin = isAuthorized && tokenType === "admin" && admin;

  useEffect(() => {
    // Wait for authentication to be fully loaded
    if (isAuthorized === null || isAuthorized === undefined) {
      // Authentication is still loading
      return;
    }

    // Only make API calls when authentication is fully loaded and user is admin
    if (isAuthorized === false) {
      // User is not authenticated at all
      setLoading(false);
      setError("Please login to access this page.");
    } else if (isAuthorized && tokenType === "admin" && admin) {
      // User is authenticated as admin
      fetchData();
    } else if (isAuthorized && tokenType !== "admin") {
      // User is authenticated but not as admin
      setLoading(false);
      setError("Access denied. Admin authentication required.");
    } else {
      // Authentication loaded but admin object not available yet
      setLoading(false);
      setError("Loading admin data...");
    }
  }, [isAuthorized, tokenType, admin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const usersRes = await api.get("/admin/users");

      console.log("Users response:", usersRes.data);

      // Validate data structure
      const usersData = Array.isArray(usersRes.data.users) ? usersRes.data.users : [];

      // Filter new registered users (users registered within the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsersData = usersData.filter(user => new Date(user.createdAt) >= thirtyDaysAgo);

      setUsers(usersData);
      setNewRegisteredUsers(newUsersData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(`Failed to fetch data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };







  const verifyUser = async (userId) => {
    try {
      const result = await api.put(`/admin/user/verify/${userId}`);
      if (result.data.success) {
        toast.success("User verified successfully");
        fetchData();
      } else {
        toast.error("Failed to verify user");
      }
    } catch (err) {
      console.error("Error verifying user:", err);
      toast.error("Error verifying user");
    }
  };

  const banUser = async (userId) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;

    try {
      const result = await api.delete(`/admin/user/${userId}`);
      if (result.data.success) {
        toast.success("User banned successfully");
        fetchData();
      } else {
        toast.error("Failed to ban user");
      }
    } catch (err) {
      console.error("Error banning user:", err);
      toast.error("Error banning user");
    }
  };



  const handleSaveService = async () => {
    if (!selectedUser) return;

    // Filter out services with empty names and validate
    const validServices = serviceFormData
      .filter(service => service.name && service.name.trim() !== '')
      .map(service => ({
        name: service.name.trim(),
        rate: typeof service.rate === 'number' ? service.rate : (parseFloat(service.rate) || 0),
        description: service.description ? service.description.trim() : ''
      }));

    if (validServices.length === 0) {
      toast.error("At least one service with a valid name is required");
      return;
    }

    setActionLoading('save-service');
    try {
      // Backend expects { services: [...] } format
      const result = await api.put(`/admin/user/service-profile/${selectedUser._id}`, {
        services: validServices
      });
      if (result.data.success) {
        toast.success("User service profile updated successfully");
        setShowServiceModal(false);
        fetchData();
      } else {
        toast.error("Failed to update service profile");
      }
    } catch (err) {
      console.error("Error updating service profile:", err);
      const errorMessage = err.response?.data?.message || "Error updating service profile";
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="user-management-container">
      <div className="loading-spinner"></div>
    </div>
  );
  if (error) return (
    <div className="user-management-container">
      <div className="analytics-header">
        <div>
          <h1>Error</h1>
        </div>
      </div>
      <div className="content-card">
        <p className="empty-state">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="user-management-container">
      <div className="analytics-header">
        <div>
          <h1>User Management</h1>
          <p className="header-description">Manage All Users</p>
        </div>
      </div>

      <div className="tab-navigation">
        <button onClick={() => setTab("users")} className={`tab-btn ${tab === "users" ? "active" : ""}`}>
          <i className="fas fa-users"></i>
          <span className="tab-text">All Users</span>
          <span className="tab-count">{users.length}</span>
        </button>
        <button onClick={() => setTab("new-users")} className={`tab-btn ${tab === "new-users" ? "active" : ""}`}>
          <i className="fas fa-user-clock"></i>
          <span className="tab-text">New Registered Users</span>
          <span className="tab-count">{newRegisteredUsers.length}</span>
        </button>

      </div>

      {tab === "users" && (
        <div className="content-card">
          <div className="card-header">
            <h2>
              <i className="fas fa-users"></i> All Users
            </h2>
            <span className="count">{users.length}</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <img
                          src={user.profilePic || "/default-avatar.png"}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="admin-avatar"
                        />
                      </td>
                      <td>
                        <div className="status-container">
                          <div className="name">{user.firstName} {user.lastName}</div>
                          <div className="user-id">ID: {user._id.slice(-6)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="email">{user.email}</div>
                        </div>
                      </td>
                      <td>{user.role === 'Community Member' ? 'Resident' : user.role}</td>
                      <td>
                        <span className={`status-badge ${
                          user.banned ? 'banned' :
                          user.verified ? 'approved' :
                          'pending'
                        }`}>
                          {user.banned ? 'Banned' :
                           user.verified ? 'Verified' :
                           'Unverified'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="action-btn view-btn"
                            title="View user details and manage account"
                          >
                            <i className="fas fa-eye"></i>
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "new-users" && (
        <div className="content-card">
          <div className="card-header">
            <h2>
              <i className="fas fa-user-clock"></i> New Registered Users
            </h2>
            <span className="count">{newRegisteredUsers.length}</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {newRegisteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">No new registered users in the last 30 days</td>
                  </tr>
                ) : (
                  newRegisteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <img
                          src={user.profilePic || "/default-avatar.png"}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="admin-avatar"
                        />
                      </td>
                      <td>
                        <div className="status-container">
                          <div className="name">{user.firstName} {user.lastName}</div>
                          <div className="user-id">ID: {user._id.slice(-6)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="email">{user.email}</div>
                        </div>
                      </td>
                      <td>{user.role === 'Community Member' ? 'Resident' : user.role}</td>
                      <td>
                        <span className={`status-badge ${
                          user.banned ? 'banned' :
                          user.verified ? 'approved' :
                          'pending'
                        }`}>
                          {user.banned ? 'Banned' :
                           user.verified ? 'Verified' :
                           'Unverified'}
                        </span>
                      </td>
                      <td>
                        <div className="registration-info">
                          <div className="registration-date">{new Date(user.createdAt).toLocaleDateString()}</div>
                          <div className="days-ago">
                            {Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))} days ago
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="action-btn view-btn"
                            title="View user details and manage account"
                          >
                            <i className="fas fa-eye"></i>
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}







      {/* Service Edit Modal */}
      {showServiceModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal-content service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header service-modal-header">
              <div className="modal-title-section">
                <i className="fas fa-edit modal-icon"></i>
                <div className="modal-title-content">
                  <h2>Edit Service Profile</h2>
                  <p className="modal-subtitle">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
              </div>
              <button className="close-modal" onClick={() => setShowServiceModal(false)}>&times;</button>
            </div>

            <div className="modal-body service-modal-body">
              {/* <div className="service-instructions">
                <i className="fas fa-info-circle instruction-icon"></i>
                <div className="instruction-content">
                  <h4>Service Management</h4>
                  <p>Configure the services this provider offers. Each service includes a name, rate, and detailed description.</p>
                </div>
              </div> */}

              <div className="services-container">
                {serviceFormData.map((service, index) => (
                  <div key={index} className="service-card">
                    <div className="service-card-header">
                      <span className="service-badge">{index + 1}</span>
                      <h4>Service Configuration</h4>
                      {serviceFormData.length > 1 && (
                        <button
                          type="button"
                          className="remove-service-btn"
                          onClick={() => {
                            const newServices = serviceFormData.filter((_, i) => i !== index);
                            setServiceFormData(newServices);
                          }}
                          title="Remove this service"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>

                    <div className="service-form-grid">
                      <div className="form-group service-name-group">
                        <label className="form-label">
                          <i className="fas fa-tools"></i>
                          Service Category
                        </label>
                        <div className="select-wrapper">
                          <select
                            value={service.name}
                            onChange={(e) => {
                              const newServices = [...serviceFormData];
                              newServices[index].name = e.target.value;
                              setServiceFormData(newServices);
                            }}
                            className="form-input service-select"
                            required
                          >
                            <option value="">Choose a service category</option>
                            {SERVICE_OPTIONS.map((option) => (
                              <option key={option.name} value={option.name}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                          <i className="fas fa-chevron-down select-arrow"></i>
                        </div>
                      </div>

                      <div className="form-group service-rate-group">
                        <label className="form-label">
                          <i className="fas fa-peso-sign"></i>
                          Service Rate ₱
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="number"
                            value={service.rate}
                            onChange={(e) => {
                              const newServices = [...serviceFormData];
                              newServices[index].rate = parseFloat(e.target.value) || 0;
                              setServiceFormData(newServices);
                            }}
                            className="form-input rate-input"
                            placeholder="0.00"
                            min="0"
                            step="50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group service-description-group">
                      <label className="form-label">
                        <i className="fas fa-file-alt"></i>
                        Service Description
                      </label>
                      <div className="textarea-wrapper">
                        <textarea
                          value={service.description}
                          onChange={(e) => {
                            const newServices = [...serviceFormData];
                            newServices[index].description = e.target.value;
                            setServiceFormData(newServices);
                          }}
                          className="form-input description-textarea"
                          rows="4"
                          placeholder="Provide a detailed description of the service offered, including what it includes and any special considerations..."
                        />
                        <div className="textarea-footer">
                          <span className="char-count">{service.description.length}/500</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="add-service-section">
                <button
                  type="button"
                  className="add-service-btn"
                  onClick={() => {
                    setServiceFormData([...serviceFormData, { name: '', rate: 0, description: '' }]);
                  }}
                >
                  <div className="add-service-content">
                    <i className="fas fa-plus-circle"></i>
                    <span>Add New Service</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="modal-actions service-modal-actions">
              <div className="action-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Services:</span>
                  <span className="summary-value">{serviceFormData.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Configured:</span>
                  <span className="summary-value">{serviceFormData.filter(s => s.name && s.name.trim() !== '').length}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-secondary cancel-btn"
                  onClick={() => setShowServiceModal(false)}
                  disabled={actionLoading === 'save-service'}
                >
                  <i className="fas fa-times"></i>
                  Cancel
                </button>
                <button
                  className="btn-primary save-btn"
                  onClick={handleSaveService}
                  disabled={actionLoading === 'save-service'}
                >
                  {actionLoading === 'save-service' ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      <span>Save Service Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-user-circle"></i> User Profile Details</h2>
              <button className="close-modal" onClick={() => setShowUserModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="user-profile">
                <div className="profile-header">
                  <img
                    src={selectedUser.profilePic || "/default-avatar.png"}
                    alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                    className="applicant-avatar"
                  />
                  <div className="profile-info">
                    <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
                    <p className="user-email">{selectedUser.email}</p>
                    <p className="user-id">ID: {selectedUser._id.slice(-6)}</p>
                    <div className="user-status-badges">
                      <span className={`status-badge ${selectedUser.banned ? 'banned' : selectedUser.role === 'Service Provider' ? 'approved' : 'pending'}`}>
                        {selectedUser.banned ? 'Banned' : selectedUser.role === 'Service Provider' ? 'Verified Provider' : 'Unverified'}
                      </span>
                      <span className={`status-badge ${selectedUser.isOnline ? 'approved' : 'pending'}`}>
                        {selectedUser.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><i className="fas fa-id-card"></i> Account Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Username</label>
                      <p>{selectedUser.username}</p>
                    </div>
                    <div className="detail-item">
                      <label>Full Name</label>
                      <p>{selectedUser.firstName} {selectedUser.lastName}</p>
                    </div>
                    <div className="detail-item">
                      <label>Email</label>
                      <p>{selectedUser.email}</p>
                    </div>
                    <div className="detail-item">
                      <label>Phone</label>
                      <p>{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Other Contact</label>
                      <p>{selectedUser.otherContact || 'Not provided'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Role</label>
                      <p>{selectedUser.role === 'Community Member' ? 'Community Resident' : selectedUser.role}</p>
                    </div>
                    <div className="detail-item">
                      <label>Member Since</label>
                      <p>{new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><i className="fas fa-user"></i> Personal Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Birthdate</label>
                      <p>{selectedUser.birthdate ? new Date(selectedUser.birthdate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Not provided'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Occupation</label>
                      <p>{selectedUser.occupation || 'Not provided'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Employment Status</label>
                      <p>{selectedUser.employed || 'Not provided'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Availability</label>
                      <p>{selectedUser.availability || 'Not Available'}</p>
                    </div>
                    <div className="detail-item">
                      <label>Accepted Work</label>
                      <p>{selectedUser.acceptedWork ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="detail-item full-width">
                      <label>Address</label>
                      <p>{selectedUser.address || 'No address information provided'}</p>
                    </div>
                  </div>
                </div>

                {(selectedUser.skills && selectedUser.skills.length > 0) && (
                  <div className="detail-section">
                    <h3><i className="fas fa-tools"></i> Skills & Expertise ({selectedUser.skills.length})</h3>
                    <div className="skills-grid">
                      {selectedUser.skills.map((skill, index) => (
                        <span key={index} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedUser.certificates && selectedUser.certificates.length > 0) && (
                  <div className="detail-section">
                    <h3><i className="fas fa-certificate"></i> Certificates ({selectedUser.certificates.length})</h3>
                    <div className="documents-preview">
                      {selectedUser.certificates.map((cert, index) => (
                        <div key={index} className="document-item">
                          <div className="document-info">
                            <i className="fas fa-file-alt"></i>
                            <span>Certificate {index + 1}</span>
                          </div>
                          <div className="document-preview">
                            {cert.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                              <img
                                src={cert}
                                alt={`Certificate ${index + 1}`}
                                className="document-image"
                                onClick={() => {
                                  setSelectedDocument(cert);
                                  setDocumentType('certificate');
                                  setShowDocumentModal(true);
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            ) : (
                              <div className="document-placeholder">
                                <i className="fas fa-file-pdf"></i>
                                <span>PDF Document</span>
                                <button
                                  className="preview-btn"
                                  onClick={() => {
                                    setSelectedDocument(cert);
                                    setDocumentType('certificate');
                                    setShowDocumentModal(true);
                                  }}
                                >
                                  <i className="fas fa-external-link-alt"></i> View
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.validId && (
                  <div className="detail-section">
                    <h3><i className="fas fa-id-badge"></i> Government ID</h3>
                    <div className="document-preview">
                      <div className="document-item">
                        <div className="document-info">
                          <i className="fas fa-id-card"></i>
                          <span>Valid ID Document</span>
                        </div>
                        <div className="document-preview">
                          {selectedUser.validId.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                              src={selectedUser.validId}
                              alt="Valid ID"
                              className="document-image"
                              onClick={() => {
                                setSelectedDocument(selectedUser.validId);
                                setDocumentType('validId');
                                setShowDocumentModal(true);
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          ) : (
                            <div className="document-placeholder">
                              <i className="fas fa-file-pdf"></i>
                              <span>ID Document</span>
                              <button
                                className="preview-btn"
                                onClick={() => {
                                  setSelectedDocument(selectedUser.validId);
                                  setDocumentType('validId');
                                  setShowDocumentModal(true);
                                }}
                              >
                                <i className="fas fa-external-link-alt"></i> View
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.notificationPreferences && (
                  <div className="detail-section">
                    <h3><i className="fas fa-bell"></i> Notification Preferences</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>E-Receipts</label>
                        <p>{selectedUser.notificationPreferences.eReceipts ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Proof of Delivery</label>
                        <p>{selectedUser.notificationPreferences.proofOfDelivery ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Email Notifications</label>
                        <p>{selectedUser.notificationPreferences.emailNotifications ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Push Notifications</label>
                        <p>{selectedUser.notificationPreferences.pushNotifications ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedUser.blockedUsers && selectedUser.blockedUsers.length > 0) && (
                  <div className="detail-section">
                    <h3><i className="fas fa-user-slash"></i> Blocked Users</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Total Blocked</label>
                        <p>{selectedUser.blockedUsers.length} user{selectedUser.blockedUsers.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.role === 'Service Provider' && selectedUser.services && selectedUser.services.length > 0 && (
                  <div className="detail-section">
                    <h3><i className="fas fa-concierge-bell"></i> Services Offered ({selectedUser.services.length})</h3>
                    <div className="services-grid">
                      {selectedUser.services.map((service, index) => (
                        <div key={index} className="service-card-item">
                          <h4>{service.name}</h4>
                          <div className="service-rate">₱{service.rate.toLocaleString()}</div>
                          <p className="service-description">{service.description || 'No description available'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedUser.bookings && selectedUser.bookings.length > 0) && (
                  <div className="detail-section">
                    <h3><i className="fas fa-calendar-check"></i> Booking History</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Total Bookings</label>
                        <p>{selectedUser.bookings.length}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedUser.notifications && selectedUser.notifications.length > 0) && (
                  <div className="detail-section">
                    <h3><i className="fas fa-bell"></i> Notifications</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Total Notifications</label>
                        <p>{selectedUser.notifications.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions user-modal-actions">
              <div className="decision-section">
                <div className="decision-header">
                  <h4><i className="fas fa-cogs"></i> Account Management</h4>
                  <p className="decision-subtitle">Manage this user's account status and permissions</p>
                </div>

                <div className="action-buttons-grid">
                  {selectedUser.role === 'Service Provider' && (
                    <button
                      className="action-btn edit-services-btn"
                      onClick={() => {
                        setServiceFormData(selectedUser.services && selectedUser.services.length > 0 ? selectedUser.services : [{ name: '', rate: 0, description: '' }]);
                        setShowServiceModal(true);
                        setShowUserModal(false);
                      }}
                      title="Edit this service provider's services"
                    >
                      <i className="fas fa-edit"></i>
                      <span>Edit Services</span>
                    </button>
                  )}

                  {!selectedUser.banned && (
                    <button
                      className="action-btn ban-user-btn"
                      onClick={() => {
                        banUser(selectedUser._id);
                        setShowUserModal(false);
                      }}
                      disabled={actionLoading === 'ban'}
                      title="Permanently ban this user from the platform"
                    >
                      {actionLoading === 'ban' ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          <span>Banning...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-slash"></i>
                          <span>Ban Account</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    className="action-btn close-modal-btn"
                    onClick={() => setShowUserModal(false)}
                    disabled={actionLoading !== null}
                    title="Close this modal"
                  >
                    <i className="fas fa-times"></i>
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
          <div className="modal-content document-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className={`fas ${documentType === 'validId' ? 'fa-id-badge' : 'fa-certificate'}`}></i>
                {documentType === 'validId' ? 'Valid ID Preview' : 'Certificate Preview'}
              </h2>
              <button className="close-modal" onClick={() => setShowDocumentModal(false)}>&times;</button>
            </div>
            <div className="modal-body document-modal-body">
              <div className="document-full-preview">
                {selectedDocument.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={selectedDocument}
                    alt={documentType === 'validId' ? 'Valid ID Document' : 'Certificate Document'}
                    className="document-full-image"
                  />
                ) : (
                  <div className="document-full-placeholder">
                    <i className="fas fa-file-pdf"></i>
                    <h3>PDF Document</h3>
                    <p>This document is in PDF format and cannot be previewed directly.</p>
                    <button
                      className="preview-btn download-btn"
                      onClick={() => window.open(selectedDocument, '_blank')}
                    >
                      <i className="fas fa-external-link-alt"></i>
                      <span>Open in New Tab</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions document-modal-actions">
              <button
                className="secondary-btn close-modal-btn"
                onClick={() => setShowDocumentModal(false)}
              >
                <i className="fas fa-times"></i>
                <span>Close</span>
              </button>
              <button
                className="primary-btn download-btn"
                onClick={() => window.open(selectedDocument, '_blank')}
              >
                <i className="fas fa-download"></i>
                <span>Download/Open</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
