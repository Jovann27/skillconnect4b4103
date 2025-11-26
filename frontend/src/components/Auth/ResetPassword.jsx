import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaArrowLeft, FaLock, FaCheck, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import api from "../../api";
import "./auth-styles.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    token: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Get parameters from URL
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (email && token) {
      setFormData(prev => ({
        ...prev,
        email,
        token
      }));
    } else {
      toast.error("Invalid reset link. Please request a new password reset.");
      navigate("/forgot-password");
    }
  }, [searchParams, navigate]);

  const validatePassword = (password) => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return "";
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return "Please confirm your password";
    }
    if (confirmPassword !== password) {
      return "Passwords do not match";
    }
    return "";
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate in real-time
    if (field === 'newPassword') {
      setValidationErrors(prev => ({
        ...prev,
        newPassword: validatePassword(value),
        confirmPassword: formData.confirmPassword ? validateConfirmPassword(formData.confirmPassword, value) : prev.confirmPassword
      }));
    } else if (field === 'confirmPassword') {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: validateConfirmPassword(value, formData.newPassword)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(formData.newPassword);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.newPassword);

    if (passwordError || confirmPasswordError) {
      setValidationErrors({
        newPassword: passwordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post("/user/reset-password", {
        email: formData.email,
        token: formData.token,
        newPassword: formData.newPassword
      });

      if (data.success) {
        toast.success("Password reset successfully! You can now log in with your new password.");
        navigate("/login");
      } else {
        toast.error(data.message || "Failed to reset password");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Failed to reset password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card reset-password-card">
        {/* Header */}
        <div className="auth-banner">
          <h2>Reset Your Password</h2>
          <p>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* New Password Field */}
          <div className="input-container icon-input">
            <i className="fas fa-lock" aria-hidden="true"></i>
            <input
              type={showPassword ? "text" : "password"}
              name="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className={`auth-input ${validationErrors.newPassword ? 'error' : formData.newPassword ? 'success' : ''}`}
              aria-describedby={validationErrors.newPassword ? 'password-error' : 'password-help'}
              aria-invalid={!!validationErrors.newPassword}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
            {formData.newPassword && !validationErrors.newPassword && (
              <FaCheck className="validation-icon success" aria-hidden="true" />
            )}
            {validationErrors.newPassword && (
              <FaTimes className="validation-icon error" aria-hidden="true" />
            )}
          </div>

          {validationErrors.newPassword && (
            <small id="password-error" className="field-error" role="alert">
              {validationErrors.newPassword}
            </small>
          )}

          {/* Confirm Password Field */}
          <div className="input-container icon-input">
            <i className="fas fa-lock" aria-hidden="true"></i>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`auth-input ${validationErrors.confirmPassword ? 'error' : formData.confirmPassword ? 'success' : ''}`}
              aria-describedby={validationErrors.confirmPassword ? 'confirm-error' : 'confirm-help'}
              aria-invalid={!!validationErrors.confirmPassword}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
            {formData.confirmPassword && !validationErrors.confirmPassword && (
              <FaCheck className="validation-icon success" aria-hidden="true" />
            )}
            {validationErrors.confirmPassword && (
              <FaTimes className="validation-icon error" aria-hidden="true" />
            )}
          </div>

          {validationErrors.confirmPassword && (
            <small id="confirm-error" className="field-error" role="alert">
              {validationErrors.confirmPassword}
            </small>
          )}

          <small id="password-help" className="form-help">
            Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols
          </small>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-btn primary"
            disabled={isSubmitting || !!validationErrors.newPassword || !!validationErrors.confirmPassword}
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                Resetting Password...
              </>
            ) : (
              <>
                <FaLock className="btn-icon" />
                Reset Password
              </>
            )}
          </button>

          <small id="submit-help" className="form-help">
            Your new password will be saved and you can use it to log in immediately
          </small>

          {/* Back to Login */}
          <div className="reset-password-footer">
            <button
              type="button"
              className="back-to-login"
              onClick={() => navigate("/login")}
            >
              <FaArrowLeft className="btn-icon" />
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
