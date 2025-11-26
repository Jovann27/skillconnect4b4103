import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaShieldAlt, FaArrowLeft, FaInfoCircle } from "react-icons/fa";
import "./auth-styles.css";

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { setIsAuthorized, setAdmin, setTokenType } = useMainContext();
  const navigate = useNavigate();

  // Clear field error when user starts typing
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    } else if (formData.password.trim().length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please check the form and fix any errors");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post(
        "/admin/auth/login",
        { email: formData.email.trim(), password: formData.password.trim() }
      );

      setAdmin(data.user);
      setIsAuthorized(true);
      setTokenType("admin");

      localStorage.setItem("admin", JSON.stringify(data.user));
      localStorage.setItem("isAuthorized", "true");
      localStorage.setItem("tokenType", "admin");
      localStorage.setItem("token", data.token);

      toast.success(`Welcome back, ${data.user.name || 'Admin'}!`);

      setFormData({ email: "", password: "" });
      setFieldErrors({});

      navigate("/admin/analytics");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please check your credentials.";

      // Provide more helpful error messages
      if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("invalid")) {
        setFieldErrors({
          general: "Invalid email or password. Please check your credentials and try again."
        });
      } else if (errorMessage.toLowerCase().includes("admin")) {
        setFieldErrors({
          general: "This account doesn't have administrator privileges. Please contact support if you need admin access."
        });
      } else {
        setFieldErrors({
          general: errorMessage
        });
      }

      toast.error("Login failed. Please check your information and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card admin-card">
        {/* Enhanced Header */}
        <div className="auth-banner admin-banner">
      
          <h2>Administrator Portal</h2>
          <p className="admin-subtitle">Secure access for authorized administrators</p>
        </div>

        {/* Error/Success Messages */}
        {fieldErrors.general && (
          <div className="error-message admin-error">
            <FaInfoCircle className="message-icon" />
            {fieldErrors.general}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="auth-form admin-form" noValidate>
          {/* Email Field */}
          <div className="form-field">
            <label htmlFor="admin-email" className="field-label">
              Administrator Email
            </label>
            <div className="input-container icon-input">
              <i className="fas fa-envelope field-icon" aria-hidden="true"></i>
              <input
                id="admin-email"
                type="email"
                name="email"
                placeholder="admin@skillconnect.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`auth-input ${fieldErrors.email ? 'error' : formData.email ? 'success' : ''}`}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.email ? 'email-error' : 'email-help'}
                aria-invalid={!!fieldErrors.email}
                autoComplete="email"
                required
              />
              {formData.email && !fieldErrors.email && (
                <FaCheck className="validation-icon success" aria-hidden="true" />
              )}
              {fieldErrors.email && (
                <FaTimes className="validation-icon error" aria-hidden="true" />
              )}
            </div>
            {fieldErrors.email && (
              <small id="email-error" className="field-error" role="alert">
                <FaTimes className="error-icon-small" />
                {fieldErrors.email}
              </small>
            )}
            <small id="email-help" className="field-help">
              Use the email address registered with your administrator account
            </small>
          </div>

          {/* Password Field */}
          <div className="form-field">
            <label htmlFor="admin-password" className="field-label">
              Password
            </label>
            <div className="input-container icon-input password-field">
              <i className="fas fa-lock field-icon" aria-hidden="true"></i>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your administrator password"
                value={formData.password}
                onChange={handleInputChange}
                className={`auth-input ${fieldErrors.password ? 'error' : formData.password ? 'success' : ''}`}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.password ? 'password-error' : 'password-help'}
                aria-invalid={!!fieldErrors.password}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {formData.password && !fieldErrors.password && (
                <FaCheck className="validation-icon success" aria-hidden="true" />
              )}
              {fieldErrors.password && (
                <FaTimes className="validation-icon error" aria-hidden="true" />
              )}
            </div>
            {fieldErrors.password && (
              <small id="password-error" className="field-error" role="alert">
                <FaTimes className="error-icon-small" />
                {fieldErrors.password}
              </small>
            )}
            <small id="password-help" className="field-help">
              Enter the password for your administrator account (minimum 6 characters)
            </small>
          </div>

          <button
            type="submit"
            className="auth-btn admin-btn"
            disabled={isSubmitting}
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                Authenticating...
              </>
            ) : (
              <>
                <FaShieldAlt className="btn-icon" />
                Access Admin Dashboard
              </>
            )}
          </button>

          <small id="submit-help" className="form-help submit-help">
            This will log you into the administrator control panel
          </small>

          {/* Navigation Links */}
          <div className="admin-navigation">
            <div className="nav-item">
              <Link to="/login" className="nav-link">
                <FaArrowLeft className="nav-icon" />
                Back to User Login
              </Link>
            </div>
            <div className="nav-item">
              <Link to="/forgot-password" className="nav-link secondary">
                Forgot your password?
              </Link>
            </div>
          </div>

          {/* Admin Help */}
          <div className="admin-help">
            <div className="help-section">
              <h4>Need Help?</h4>
              <ul>
                <li>Make sure you're using the correct administrator email</li>
                <li>Check that your account has administrator privileges</li>
                <li>Contact your system administrator if you need access</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
