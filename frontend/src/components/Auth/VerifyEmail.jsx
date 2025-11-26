import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaArrowLeft, FaEnvelope, FaCheck, FaTimes } from "react-icons/fa";
import api from "../../api";
import "./auth-styles.css";

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Get email from localStorage or URL params
    const storedEmail = localStorage.getItem('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      toast.error("No email found. Please try again.");
      navigate("/forgot-password");
    }
  }, [navigate]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < otp.length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setValidationErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post("/user/verify-otp", {
        email,
        otp: otpValue,
        purpose: "password_reset"
      });

      if (data.success) {
        // Store the token for password reset
        localStorage.setItem('resetToken', data.token);
        toast.success("Email verified successfully!");
        navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.token)}`);
      } else {
        setValidationErrors({ otp: data.message || "Invalid verification code" });
      }
    } catch (error) {
      setValidationErrors({
        otp: error.response?.data?.message || "Failed to verify code. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setIsResending(true);

    try {
      const { data } = await api.post("/user/send-verification-otp", {
        email,
        purpose: "password_reset"
      });

      if (data.success) {
        setResendTimer(60);
        toast.success("Verification code sent again!");
      } else {
        toast.error(data.message || "Failed to resend code");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Failed to resend verification code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card verify-email-card">
        <div className="auth-banner">
          <h2>Verify Your Email</h2>
          <p>Enter the 6-digit code sent to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="email-display">
            <FaEnvelope className="email-icon" />
            <span>{email}</span>
          </div>

          {/* OTP Input */}
          <div className="otp-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`otp-input ${validationErrors.otp ? 'error' : digit ? 'filled' : ''}`}
                aria-describedby={validationErrors.otp ? 'otp-error' : 'otp-help'}
                aria-invalid={!!validationErrors.otp}
                autoComplete="one-time-code"
                required
              />
            ))}
          </div>

          {validationErrors.otp && (
            <small id="otp-error" className="field-error" role="alert">
              {validationErrors.otp}
            </small>
          )}

          <small id="otp-help" className="form-help">
            Enter the 6-digit verification code sent to your email address
          </small>

          {/* Resend Code */}
          <div className="resend-container">
            <button
              type="button"
              className="resend-btn"
              onClick={handleResend}
              disabled={resendTimer > 0 || isResending}
            >
              {isResending ? (
                "Sending..."
              ) : resendTimer > 0 ? (
                `Resend code in ${resendTimer}s`
              ) : (
                "Resend verification code"
              )}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-btn primary"
            disabled={isSubmitting || otp.join('').length !== 6}
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <>
                Verifying...
              </>
            ) : (
              <>
                <FaCheck className="btn-icon" />
                Verify Email
              </>
            )}
          </button>

          <small id="submit-help" className="form-help">
            Verify your email to proceed with password reset
          </small>

          {/* Back to Forgot Password */}
          <div className="verify-email-footer">
            <button
              type="button"
              className="back-to-forgot"
              onClick={() => navigate("/forgot-password")}
            >
              <FaArrowLeft className="btn-icon" />
              Back to Forgot Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;
