import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaArrowLeft, FaEnvelope, FaCheck, FaTimes } from "react-icons/fa";
import api from "../../api";
import "./auth-styles.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email address is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setValidationErrors({
      ...validationErrors,
      email: validateEmail(value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setValidationErrors({ email: emailError });
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post("/user/send-verification-otp", {
        email,
        purpose: "password_reset"
      });

      if (data.success) {
        // Store email for verification step
        localStorage.setItem('resetEmail', email);
        toast.success("Verification code sent to your email!");
        navigate("/verify-email");
      } else {
        toast.error(data.message || "Failed to send verification code");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Failed to send verification code. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {/* Header */}
        <div className="forgot-password-header">
          <h2>Forgot Password?</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="forgot-password-form" noValidate>
          {/* Email Field */}
          <div className="email-input-group">
            <FaEnvelope />
            <input
              type="email"
              name="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={handleEmailChange}
              className="email-input"
              aria-describedby={validationErrors.email ? 'email-error' : 'email-help'}
              aria-invalid={!!validationErrors.email}
              autoComplete="email"
              required
            />
            {email && !validationErrors.email && (
              <FaCheck className="success-icon" aria-hidden="true" />
            )}
          </div>

          {validationErrors.email && (
            <small id="email-error" className="error-message" role="alert">
              {validationErrors.email}
            </small>
          )}

          {email && !validationErrors.email && (
            <small className="success-message" role="alert">
              Email address looks good!
            </small>
          )}

          <small id="email-help" className="help-text">
            Enter the email address associated with your account - we'll send you a password reset link
          </small>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || !!validationErrors.email}
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                Sending Reset Email...
              </>
            ) : (
              <>
                <FaEnvelope className="button-icon" />
                Send Reset Email
              </>
            )}
          </button>

          <small id="submit-help" className="help-text">
            We'll send you an email with instructions to reset your password
          </small>

          {/* Back to Login */}
          <div className="back-to-login-section">
            <Link to="/login" className="back-link">
              <FaArrowLeft className="link-icon" />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
