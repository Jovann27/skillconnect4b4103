import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaUpload } from "react-icons/fa";
import "./auth-styles.css";

const Register = () => {
  const [formData, setFormData] = useState({
    role: "",
    skills: [],
    profilePic: null,
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    occupation: "",
    birthdate: "",
    employed: "",
    isApplyingProvider: false,
    certificates: [],
    validId: null,
  });

  const [showPopup, setShowPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthorized, setIsAuthorized, setUser, setTokenType } = useMainContext();
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};

    if (!formData.username || formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters long";
    }

    // Password validation (must match backend requirement of 8 characters)
    if (!formData.password || formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone validation (must match backend format: +63XXXXXXXXXX or 0XXXXXXXXXX)
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      errors.phone = "Invalid phone number format. Use +63XXXXXXXXXX or 0XXXXXXXXXX";
    }

    // Required fields validation
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.birthdate) errors.birthdate = "Birthdate is required";
    if (!formData.employed || !["employed", "unemployed"].includes(formData.employed)) {
      errors.employed = "Employment status must be Employed or Unemployed";
    }
    if (!formData.role || !["Community Member", "Service Provider"].includes(formData.role)) {
      errors.role = "Please select a valid role";
    }
    if (!formData.validId) {
        errors.validId = "Valid ID is required";
      } else if (!formData.validId.type.startsWith("image/")) {
        errors.validId = "Valid ID must be an image file (JPG, PNG, etc.)";
      }

    // Service Provider specific validation
    if (formData.role === "Service Provider") {
      if (!formData.skills || formData.skills.length === 0) {
        errors.skills = "At least one skill is required for Service Providers";
      } else if (formData.skills.length > 3) {
        errors.skills = "You can select a maximum of 3 skills";
      }
      if (formData.certificates.length === 0) {
        errors.certificates = "Certificates are required for Service Providers";
      }

    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation on change

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      if (name === "certificates") {
        setFormData({ ...formData, certificates: Array.from(files) });
      } else {
        setFormData({ ...formData, [name]: files[0] });
      }
    } else {
    const updatedData = { ...formData, [name]: value };
      if (name === "role") {
        updatedData.isApplyingProvider = value === "Service Provider";
      }
      setFormData(updatedData);
    }
    validateForm();
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      
      // Always include required fields
      submitData.append("username", formData.username);
      submitData.append("password", formData.password);
      submitData.append("confirmPassword", formData.confirmPassword);
      submitData.append("firstName", formData.firstName);
      submitData.append("lastName", formData.lastName);
      submitData.append("email", formData.email);
      submitData.append("phone", formData.phone);
      submitData.append("address", formData.address);
      submitData.append("birthdate", formData.birthdate);
      submitData.append("employed", formData.employed);
      submitData.append("role", formData.role);
      
      // Optional fields
      if (formData.occupation) {
        submitData.append("occupation", formData.occupation);
      }
      
      // Profile picture (optional)
      if (formData.profilePic) {
        submitData.append("profilePic", formData.profilePic);
      }
      
      // Send validId for all users (required for both Community Members and Service Providers)
      if (formData.validId) {
        submitData.append("validId", formData.validId);
      }

      // Service Provider specific fields (only send if role is Service Provider)
      if (formData.role === "Service Provider") {
        if (formData.skills && formData.skills.length > 0) {
          // Backend expects array - FormData will handle multiple values with same key as array
          formData.skills.forEach((skill) => submitData.append("skills", skill));
        }
        if (formData.certificates && formData.certificates.length > 0) {
          formData.certificates.forEach((file) => submitData.append("certificates", file));
        }
      }
      // For Community Members, don't send skills or certificates

      const { data } = await api.post(
        "/user/register",
        submitData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      toast.success(data.message);
      setShowPopup(true);
      setUser(data.user);
      setIsAuthorized(true);
      setTokenType("user");
      
      // Navigate based on user role
      // Service Provider → /user/my-service
      // Community Member → /user/service-request
      if (data.user.role === "Service Provider Applicant") {
        navigate("/user/my-service", { replace: true });
        localStorage.setItem("userLastPath", "/user/my-service");
      } else {
        // Community Member
        navigate("/user/service-request", { replace: true });
        localStorage.setItem("userLastPath", "/user/service-request");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isAuthorized", "true");
      localStorage.setItem("tokenType", "user");


      setTimeout(() => setShowPopup(false), 5000);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      toast.error(errorMessage);
      
      // Log validation errors for debugging
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, label: "" };
    if (password.length < 8) return { strength: 1, label: "Weak" };
    if (password.length < 12) return { strength: 2, label: "Medium" };
    return { strength: 3, label: "Strong" };
  };

  const passwordStrength = getPasswordStrength(formData.password);
  

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        {/* Banner */}
        <div className="auth-banner">
          <h2>SkillConnect4B410</h2>
          <p>Create your account to book or offer services in the community.</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form register-form" noValidate>
          {/* Account Information Section */}
          <div className="form-section">
            <h3 className="section-title">Account Information</h3>

            {/* Profile Picture */}
            <div className="form-group file-upload register-file">
              <label htmlFor="profilePic" className="register-label">
                Profile Picture (Optional)
              </label>
              <input
                type="file"
                id="profilePic"
                name="profilePic"
                accept="image/*"
                onChange={handleChange}
                className={`auth-input ${formData.profilePic ? 'success' : ''}`}
                aria-describedby="profilePic-help"
              />
              <div className="preview-box" aria-live="polite">
                {formData.profilePic ? (
                  <img
                    src={URL.createObjectURL(formData.profilePic)}
                    alt="Profile preview"
                  />
                ) : (
                  <span>No file selected</span>
                )}
              </div>
              <small id="profilePic-help" className="form-help">
                Upload a profile picture (JPG, PNG only, max 5MB)
              </small>
            </div>

            {/* Username */}
            <div className="input-container">
              <label htmlFor="username" className="field-label">Username</label>
              <div className="icon-input">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Choose a unique username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`auth-input ${validationErrors.username ? 'error' : ''}`}
                  aria-describedby={validationErrors.username ? 'username-error' : 'username-help'}
                  aria-invalid={!!validationErrors.username}
                  autoComplete="username"
                />
              </div>
              {validationErrors.username && (
                <span id="username-error" className="field-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {validationErrors.username}
                </span>
              )}
            <small id="username-help" className="form-help">
              Choose a unique username (minimum 3 characters) - this will be visible to other users
            </small>
          </div>
          </div>

          {/* Personal Details Section */}
          <div className="form-section">
            <h3 className="section-title">Personal Details</h3>

          {/* Password */}
          <div className="input-container">
            <label htmlFor="password" className="field-label">Password</label>
            <div className="icon-input">
              <i className="fas fa-lock"></i>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`auth-input ${validationErrors.password ? 'error' : ''}`}
                aria-describedby={validationErrors.password ? 'password-error' : 'password-help'}
                aria-invalid={!!validationErrors.password}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {validationErrors.password && (
              <span id="password-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.password}
              </span>
            )}
            <small id="password-help" className="form-help">
              Password must be at least 8 characters long
            </small>
          </div>

          {/* Confirm Password */}
          <div className="input-container">
            <label htmlFor="confirmPassword" className="field-label">Confirm Password</label>
            <div className="icon-input">
              <i className="fas fa-lock"></i>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`auth-input ${validationErrors.confirmPassword ? 'error' : ''}`}
                aria-describedby={validationErrors.confirmPassword ? 'confirmPassword-error' : 'confirmPassword-help'}
                aria-invalid={!!validationErrors.confirmPassword}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span id="confirmPassword-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.confirmPassword}
              </span>
            )}
            <small id="confirmPassword-help" className="form-help">
              Re-enter your password to confirm
            </small>
          </div>

          {/* Email */}
          <div className="input-container">
            <div className="icon-input">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
                className={`auth-input ${validationErrors.email ? 'error' : ''}`}
                aria-describedby={validationErrors.email ? 'email-error' : 'email-help'}
                aria-invalid={!!validationErrors.email}
              />
            </div>
            {validationErrors.email && (
              <span id="email-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.email}
              </span>
            )}
            <small id="email-help" className="form-help">
              We'll use this email to send you important updates about your account
            </small>
          </div>

          {/* First Name */}
          <div className="input-container">
            <div className="icon-input">
              <i className="fas fa-id-card"></i>
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={`auth-input ${validationErrors.firstName ? 'error' : ''}`}
                aria-describedby={validationErrors.firstName ? 'firstName-error' : 'firstName-help'}
                aria-invalid={!!validationErrors.firstName}
              />
            </div>
            {validationErrors.firstName && (
              <span id="firstName-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.firstName}
              </span>
            )}
          </div>

          {/* Last Name */}
          <div className="input-container">
            <div className="icon-input">
              <i className="fas fa-id-card"></i>
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={`auth-input ${validationErrors.lastName ? 'error' : ''}`}
                aria-describedby={validationErrors.lastName ? 'lastName-error' : 'lastName-help'}
                aria-invalid={!!validationErrors.lastName}
              />
            </div>
            {validationErrors.lastName && (
              <span id="lastName-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.lastName}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className="input-container">
            <div className="icon-input">
              <i className="fas fa-phone"></i>
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required
                className={`auth-input ${validationErrors.phone ? 'error' : ''}`}
                aria-describedby={validationErrors.phone ? 'phone-error' : 'phone-help'}
                aria-invalid={!!validationErrors.phone}
              />
            </div>
            {validationErrors.phone && (
              <span id="phone-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {validationErrors.phone}
              </span>
            )}
            <small id="phone-help" className="form-help">
              Use format: +63XXXXXXXXXX or 0XXXXXXXXXX (10 digits after country code)
            </small>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="field-label">Address</label>
            <div className="input-container icon-input">
              <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                required
                className={`register-input ${validationErrors.address ? 'error' : formData.address ? 'success' : ''}`}
                aria-describedby={validationErrors.address ? 'address-error' : 'address-help'}
                aria-invalid={!!validationErrors.address}
              />
              {formData.address && !validationErrors.address && (
                <FaCheck className="validation-icon success" aria-hidden="true" />
              )}
              {validationErrors.address && (
                <FaTimes className="validation-icon error" aria-hidden="true" />
              )}
            </div>
          </div>
          {validationErrors.address && (
            <small id="address-error" className="field-error" role="alert">
              {validationErrors.address}
            </small>
          )}

          {/* Occupation */}
          <div className="form-group">
            <label className="field-label">Occupation</label>
            <div className="input-container icon-input">
              <i className="fas fa-briefcase" aria-hidden="true"></i>
              <input
                type="text"
                name="occupation"
                placeholder="Occupation"
                value={formData.occupation}
                onChange={handleChange}
                className={`register-input ${formData.occupation ? 'success' : ''}`}
                aria-describedby="occupation-help"
              />
              {formData.occupation && (
                <FaCheck className="validation-icon success" aria-hidden="true" />
              )}
            </div>
          </div>
          <small id="occupation-help" className="form-help">
            Optional: Enter your current occupation or profession
          </small>

          {/* Role */}
          <div className="form-group">
            <label className="field-label">Role</label>
            <div className="input-container icon-input">
              <i className="fas fa-user-tag" aria-hidden="true"></i>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className={`register-input ${validationErrors.role ? 'error' : formData.role ? 'success' : ''}`}
                aria-describedby={validationErrors.role ? 'role-error' : 'role-help'}
                aria-invalid={!!validationErrors.role}
                aria-label="Select your role in the community"
              >
                <option value="">Select your role</option>
                <option value="Community Member">Community Member</option>
                <option value="Service Provider">Service Provider</option>
              </select>
            </div>
          </div>
          {validationErrors.role && (
            <small id="role-error" className="field-error" role="alert">
              {validationErrors.role}
            </small>
          )}
          <small id="role-help" className="form-help">
            Community Members can request services, Service Providers can offer services
          </small>

          {formData.role === "Service Provider" && (
            <>
              {/* Skills Selection */}
              <div className="skills-selection">
                <label className="skills-label">
                  <i className="fas fa-tools" aria-hidden="true"></i>
                  Select Your Skills (Choose 1-3)
                </label>
                <div className="skills-grid">
                  {[
                    "Pipe Installation", "Leak Repair", "Toilet Installation", "Drain Cleaning", "Water Heater Setup",
                    "Wiring Installation", "Lighting Repair", "Appliance Troubleshooting", "Outlet Installation", "Circuit Breaker Maintenance",
                    "General House Cleaning", "Deep Cleaning", "Carpet Cleaning", "Sofa Shampooing", "Post-Construction Cleaning",
                    "Furniture Repair", "Wood Polishing", "Door and Window Fixing", "Custom Woodwork", "Cabinet Installation",
                    "Interior Painting", "Exterior Painting", "Repainting", "Wallpaper Installation", "Color Consultation",
                    "Air Conditioner Repair", "Refrigerator Repair", "Washing Machine Repair", "Microwave Oven Fixing", "Electric Fan Maintenance",
                    "Tiling", "Roofing", "Masonry", "Floor Installation", "Room Remodeling",
                    "Termite Treatment", "Cockroach Control", "Rodent Control", "Disinfection", "Mosquito Control",
                    "Lawn Mowing", "Plant Care", "Landscape Design", "Tree Trimming", "Garden Cleanup",
                    "Aircon Installation", "Aircon Cleaning", "HVAC Maintenance", "Filter Replacement", "Ventilation Setup",
                    "Washing Clothes", "Drying & Ironing", "Folding & Packaging", "Delicate Fabric Care", "Stain Removal"
                  ].map((skill) => (
                    <div key={skill} className="skill-item">
                      <label className="skill-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(skill)}
                          onChange={(e) => {
                            const currentSkills = [...formData.skills];
                            if (e.target.checked) {
                              if (currentSkills.length < 3) {
                                currentSkills.push(skill);
                              }
                            } else {
                              const index = currentSkills.indexOf(skill);
                              if (index > -1) {
                                currentSkills.splice(index, 1);
                              }
                            }
                            setFormData({ ...formData, skills: currentSkills });
                            validateForm();
                          }}
                          disabled={!formData.skills.includes(skill) && formData.skills.length >= 3}
                        />
                        <span className="checkmark"></span>
                        <div className="skill-content">
                          <div className="skill-name">{skill}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="skills-count">
                  Selected: {formData.skills.length}/3 skills
                </div>
              </div>
              {validationErrors.skills && (
                <small id="skills-error" className="field-error" role="alert">
                  {validationErrors.skills}
                </small>
              )}
              <small id="skills-help" className="form-help">
                Choose up to 3 skills that best match your expertise
              </small>
            </>
          )}

          {/* Birthdate */}
          <div className="form-group">
            <label className="field-label">Birth Date</label>
            <div className="input-container icon-input">
              <i className="fas fa-calendar" aria-hidden="true"></i>
              <input
                type="date"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
                required
                className={`register-input ${validationErrors.birthdate ? 'error' : formData.birthdate ? 'success' : ''}`}
                aria-describedby={validationErrors.birthdate ? 'birthdate-error' : 'birthdate-help'}
                aria-invalid={!!validationErrors.birthdate}
                max={new Date().toISOString().split('T')[0]}
              />
              {formData.birthdate && !validationErrors.birthdate && (
                <FaCheck className="validation-icon success" aria-hidden="true" />
              )}
              {validationErrors.birthdate && (
                <FaTimes className="validation-icon error" aria-hidden="true" />
              )}
            </div>
          </div>
          {validationErrors.birthdate && (
            <small id="birthdate-error" className="field-error" role="alert">
              {validationErrors.birthdate}
            </small>
          )}

          {/* Employment Status */}
          <div className="form-group">
            <label className="field-label">Employment Status</label>
            <div className="input-container icon-input">
              <i className="fas fa-briefcase" aria-hidden="true"></i>
              <select
                name="employed"
                value={formData.employed}
                onChange={handleChange}
                required
                className={`register-input ${validationErrors.employed ? 'error' : formData.employed ? 'success' : ''}`}
                aria-describedby={validationErrors.employed ? 'employed-error' : 'employed-help'}
                aria-invalid={!!validationErrors.employed}
                aria-label="Select your employment status"
              >
                <option value="">Select Employment Status</option>
                <option value="employed">Employed</option>
                <option value="unemployed">Unemployed</option>
              </select>
              {formData.employed && !validationErrors.employed && (
                <FaCheck className="validation-icon success" aria-hidden="true" />
              )}
              {validationErrors.employed && (
                <FaTimes className="validation-icon error" aria-hidden="true" />
              )}
            </div>
          </div>
          {validationErrors.employed && (
            <small id="employed-error" className="field-error" role="alert">
              {validationErrors.employed}
            </small>
          )}
          </div>
          
              {/* Valid ID */}
              <div className="form-group file-upload">
                <label htmlFor="validId" className="register-label">
                  Upload Valid ID *
                </label>
                <input
                  type="file"
                  id="validId"
                  name="validId"
                  accept="image/*"
                  onChange={handleChange}
                  className={`register-input ${validationErrors.validId ? 'error' : formData.validId ? 'success' : ''}`}
                  aria-describedby={validationErrors.validId ? 'validId-error' : 'validId-help'}
                  aria-invalid={!!validationErrors.validId}
                />
                <div className="file-preview" aria-live="polite">
                  {formData.validId ? (
                    formData.validId.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(formData.validId)}
                        alt="Valid ID preview"
                      />
                    ) : (
                      <span className="file-name">Invalid file type. Please select an image.</span>
                    )
                  ) : (
                    <span className="no-file">No file selected</span>
                  )}
                </div>
                {validationErrors.validId && (
                  <small id="validId-error" className="field-error" role="alert">
                    {validationErrors.validId}
                  </small>
                )}
                <small id="validId-help" className="form-help">
                  Upload a government-issued ID (images only: JPG, PNG, etc.)
                </small>
              </div>
          {/* Service Provider Documents */}
          {formData.role === "Service Provider" && (
            <>
              {/* Certificates */}
              <div className="form-group file-upload">
                <label htmlFor="certificates" className="register-label">
                  Upload Certificates *
                </label>
                <input
                  type="file"
                  id="certificates"
                  name="certificates"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleChange}
                  className={`register-input ${validationErrors.certificates ? 'error' : formData.certificates.length > 0 ? 'success' : ''}`}
                  aria-describedby={validationErrors.certificates ? 'certificates-error' : 'certificates-help'}
                  aria-invalid={!!validationErrors.certificates}
                />
                <div className="file-list" aria-live="polite">
                  {formData.certificates.length > 0 ? (
                    formData.certificates.map((file, index) => (
                      <div key={index} className="file-item">
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Certificate ${index + 1}`}
                          />
                        ) : (
                          <span className="file-name">{file.name}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="no-files">No files selected</span>
                  )}
                </div>
                {validationErrors.certificates && (
                  <small id="certificates-error" className="field-error" role="alert">
                    {validationErrors.certificates}
                  </small>
                )}
                <small id="certificates-help" className="form-help">
                  Upload certificates or licenses that prove your skills
                </small>
              </div>

            </>
          )}

          <button
            type="submit"
            className="auth-btn register-btn"
            disabled={isSubmitting || Object.keys(validationErrors).length > 0}
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
          <small id="submit-help" className="form-help">
            By creating an account, you agree to our terms of service
          </small>

          <div className="auth-links">
            <p>
              Already have an account? <Link to="/login">Login</Link> |{" "}
              <Link to="/admin/login">Admin Login</Link>
            </p>
          </div>
        </form>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>
              Registration successful! Welcome to SkillConnect.
            </h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
