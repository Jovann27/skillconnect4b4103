import { useState, useEffect, useMemo } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import './dashboard-content.css';

const ManageProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchUserInsights(user._id);
    }
  }, [user?._id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/me');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      setError('Failed to fetch profile data');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInsights = async (userId) => {
    try {
      setReviewsLoading(true);
      const [reviewsRes, statsRes] = await Promise.all([
        api.get(`/review/user/${userId}`),
        api.get(`/review/stats/${userId}`)
      ]);
      if (reviewsRes.data.success) {
        setReviews(reviewsRes.data.reviews || []);
      }
      if (statsRes.data.success) {
        setReviewStats(statsRes.data.stats || { averageRating: 0, totalReviews: 0 });
      }
    } catch (insightError) {
      console.error('Error fetching review insights:', insightError);
    } finally {
      setReviewsLoading(false);
    }
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const [userPart, domain] = email.split('@');
    if (!domain) return email;
    const visible = userPart.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(userPart.length - 2, 3))}@${domain}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/.(?=.{4})/g, '*');
  };

  const formatAddress = (address = '') => {
    const [street, rest] = address.split(',');
    return rest ? `${street.trim()}, ${rest.trim()}` : address;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const displaySkills = useMemo(() => {
    if (!user?.skills || user.skills.length === 0) return 'No skills added yet';
    return user.skills.map(skill => skill.charAt(0).toUpperCase() + skill.slice(1)).join(' • ');
  }, [user?.skills]);

  const renderStars = (value = 0) =>
    Array.from({ length: 5 }, (_, index) => {
      const score = index + 1;
      return (
        <span key={score} className="star-icon" aria-hidden="true">
          {value >= score ? <FaStar /> : <FaRegStar />}
        </span>
      );
    });

  const placeholderProofs = ['', '', ''];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
          <p className="text-gray-600">Unable to load your profile data.</p>
        </div>
      </div>
    );
  }

  const bioText = user.serviceDescription || '“Reliable and detail-oriented worker.”';

  return (
    <div className="main-content manage-profile-shell">
      <div className="profile-wrapper profile-overview">
        <div className="profile-layout-grid">
          <aside className="profile-summary-card">
            <div className="summary-avatar">
              {user.profilePic ? (
                <img src={user.profilePic} alt="Profile" />
              ) : (
                <div className="avatar-placeholder-large">
                  {user.firstName?.charAt(0) || user.lastName?.charAt(0) || 'S'}
                </div>
              )}
            </div>

            <div className="summary-details">
              <h2>{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</h2>
              <p className="summary-role">{user.occupation || 'Independent Specialist'}</p>
              <p className="summary-location">{formatAddress(user.address)}</p>
            </div>

            <div className="summary-rating-row">
              <div>
                <span className="rating-value">
                  {reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '0.0'}
                </span>
                <span className="rating-label">/ 5 rating</span>
              </div>
              <div className="rating-meta">
                <span>{reviewStats.totalReviews || 0} Reviews</span>
                <span>{user.bookings?.length || 0} Jobs</span>
              </div>
            </div>

            <div className="summary-info-grid">
              <div className="info-line">
                <span>Email</span>
                <strong>{maskEmail(user.email)}</strong>
              </div>
              <div className="info-line">
                <span>Phone</span>
                <strong>{maskPhone(user.phone)}</strong>
              </div>
              <div className="info-line">
                <span>Skills</span>
                <strong>{displaySkills}</strong>
              </div>
              <div className="info-line">
                <span>Services</span>
                <strong>{user.services?.length ? `${user.services.length} Listed` : 'Not set'}</strong>
              </div>
            </div>

            <blockquote className="profile-quote">{bioText}</blockquote>

            <p className="privacy-note">
              *If the individual user views the skilled user their email and phone number will be hidden
              <br />
              ex: ju****@gmail.com, 09*****65
            </p>

            <button
              type="button"
              className="btn-outline profile-edit-btn"
              onClick={() => navigate('/user/general-settings')}
            >
              Edit Profile
            </button>
          </aside>

          <section className="profile-reviews-panel">
            <div className="reviews-header">
              <div>
                <p className="eyebrow-text">Performance Snapshot</p>
                <h1 className="page-title">All Reviews</h1>
              </div>
              <div className="reviews-header-meta">
                <span>{reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '0.0'} ★</span>
                <span>{reviewStats.totalReviews || 0} total reviews</span>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {reviewsLoading ? (
              <div className="reviews-loading">Loading feedback…</div>
            ) : reviews.length === 0 ? (
              <div className="reviews-empty">
                <p>No reviews yet</p>
                <small>Completed jobs will automatically appear here when clients leave feedback.</small>
              </div>
            ) : (
              <div className="reviews-stack">
                {reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <header className="review-card-header">
                      <div>
                        <p className="review-type">Client Review</p>
                        <h3>{review.clientName || 'Anonymous Client'}</h3>
                        <p className="review-service-label">
                          Service Needed:&nbsp;
                          <span>{review.service || 'Service Request'}</span>
                        </p>
                      </div>
                      <span className="review-date">{formatDate(review.createdAt)}</span>
                    </header>

                    <div className="review-comment">
                      <span>Comment:</span> {review.comment || 'No comment was provided.'}
                    </div>

                    <div className="review-proof">
                      <span>Proof Work:</span>
                      <div className="proof-grid">
                        {(review.images?.length ? review.images : placeholderProofs).map((img, idx) =>
                          img ? (
                            <img src={img} alt={`Proof ${idx + 1}`} key={idx} />
                          ) : (
                            <div className="proof-placeholder" key={idx} aria-hidden="true" />
                          )
                        )}
                      </div>
                    </div>

                    <div className="review-rating-row">
                      <span>Rating:</span>
                      <div className="stars-row">
                        {renderStars(review.rating)}
                        <strong>{review.rating?.toFixed(1) || '0.0'}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ManageProfile;
