import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { updateSocketToken } from "../../utils/socket";
import "./auth-styles.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthorized, setUser, setTokenType, setIsUserVerified } = useMainContext();
  const navigate = useNavigate();

  // Real-time validation
  const validateField = (name, value) => {
    let error = "";
    if (name === "email") {
      if (!value) {
        error = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        error = "Please enter a valid email address";
      }
    } else if (name === "password") {
      if (!value) {
        error = "Password is required";
      } else if (value.length < 6) {
        error = "Password must be at least 6 characters";
      }
    }
    return error;
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    const emailError = validateField("email", formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateField("password", formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const storedToken = localStorage.getItem("token");
    const isAuth = localStorage.getItem("isAuthorized") === "true";
    const type = localStorage.getItem("tokenType");

    if (storedUser && isAuth && storedToken && type === "user") {
      setUser(storedUser);
      setIsAuthorized(true);
      setTokenType(type);
      setIsUserVerified(storedUser.role === "Service Provider" || false);
      updateSocketToken(storedToken);

      // Navigate based on user role (for stored session check)
      // Service Provider → /user/my-service
      // Community Member → /user/service-request
      if (storedUser.role === "Service Provider") {
        navigate("/user/my-service", { replace: true });
        localStorage.setItem("userLastPath", "/user/my-service");
      } else {
        // Community Member
        navigate("/user/service-request", { replace: true });
        localStorage.setItem("userLastPath", "/user/service-request");
      }
    }
  }, [navigate, setUser, setIsAuthorized, setTokenType, setIsUserVerified]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post("/user/login", {
        email: formData.email,
        password: formData.password
      });


      setUser(data.user);
      setIsAuthorized(true);
      setTokenType("user");
      setIsUserVerified(data.user.isVerified || false);

      // Update localStorage with user data and token
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      localStorage.setItem("isAuthorized", "true");
      localStorage.setItem("tokenType", "user");


      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
      }

      // Update socket token for real-time chat
      const token = localStorage.getItem("token");
      if (token) {
        updateSocketToken(token);
      }

      toast.success(data.message || "Login successful!");

      // Clear form
      setFormData({ email: "", password: "" });
      setErrors({});

      // Navigate based on user role (ignore last path on fresh login)
      // Service Provider → /user/my-service
      // Community Member → /user/service-request
      if (data.user.role === "Service Provider") {
        navigate("/user/my-service", { replace: true });
        localStorage.setItem("userLastPath", "/user/my-service");
      } else {
        // Community Member
        navigate("/user/service-request", { replace: true });
        localStorage.setItem("userLastPath", "/user/service-request");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);

      // Set specific error if email/password related
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("password")) {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-banner">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
        </div>

        {errors.general && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          {/* Email Field */}
          <div className="input-container">
            <label htmlFor="email" className="field-label">Email Address</label>
            <div className="icon-input">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`auth-input ${errors.email ? 'error' : (formData.email && !errors.email ? 'success' : '')}`}
                disabled={isLoading}
                aria-describedby={errors.email ? "email-error" : "email-help"}
                aria-invalid={!!errors.email}
                autoComplete="email"
                required
              />
            </div>
            {errors.email && (
              <span id="email-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {errors.email}
              </span>
            )}
            <small id="email-help" className="form-help">
              Enter the email address associated with your account
            </small>
          </div>

          {/* Password Field */}
          <div className="input-container">
            <label htmlFor="password" className="field-label">Password</label>
            <div className="icon-input">
              <i className="fas fa-lock"></i>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className={`auth-input ${errors.password ? 'error' : (formData.password && !errors.password ? 'success' : '')}`}
                disabled={isLoading}
                aria-describedby={errors.password ? "password-error" : "password-help"}
                aria-invalid={!!errors.password}
                autoComplete="current-password"
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
            </div>
            {errors.password && (
              <span id="password-error" className="field-error">
                <i className="fas fa-exclamation-circle"></i>
                {errors.password}
              </span>
            )}
            <small id="password-help" className="form-help">
              Minimum 6 characters required
            </small>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="form-options">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Sign Up Link */}
          <div className="auth-links">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="auth-link-text">
                Create one here
              </Link>
            </p>
            <p className="admin-link">
              Admin?{" "}
              <Link to="/admin/login" className="admin-link-text">
                Login as Administrator
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
