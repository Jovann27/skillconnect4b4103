import { useState, useEffect } from "react";
import {
  FaLightbulb,
  FaTools,
  FaUsers,
  FaChartLine,
  FaDownload,
  FaSync,
  FaProjectDiagram,
  FaGraduationCap,
  FaBuilding,
  FaHandshake
} from "react-icons/fa";
import './SystemAnalytics.css';
import api from "../../api";
import toast from "react-hot-toast";

const SystemRecommendations = () => {
  const [analyticsData, setAnalyticsData] = useState({
    totals: { totalUsers: 0, serviceProviders: 0, totalPopulation: 0 },
    demographics: { ageGroups: {}, employment: {} },
    skills: {},
    skilledPerTrade: { byRole: {}, bySkill: {} },
    mostBookedServices: {},
    totalsOverTime: { labels: [], values: [] },
    activeUsers: 0,
    totalBookings: 0,
    popularServices: []
  });

  const [recommendations, setRecommendations] = useState({
    barangayProjects: [],
    skillsTraining: [],
    communityPrograms: [],
    priorityActions: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("12");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  useEffect(() => {
    if (analyticsData.totals.totalUsers > 0) {
      generateRecommendations();
    }
  }, [analyticsData]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        totalsRes,
        demographicsRes,
        skillsRes,
        skilledPerTradeRes,
        mostBookedRes,
        totalsOverTimeRes
      ] = await Promise.all([
        api.get("/reports/totals"),
        api.get("/reports/demographics"),
        api.get("/reports/skills"),
        api.get("/reports/skilled-per-trade"),
        api.get("/reports/most-booked-services"),
        api.get(`/reports/totals-over-time?months=${timeRange}`)
      ]);

      const totalsData = totalsRes.data?.data || totalsRes.data || {};
      const demographicsData = demographicsRes.data?.data || demographicsRes.data || {};
      const skillsData = skillsRes.data?.data || skillsRes.data || {};
      const skilledPerTradeData = skilledPerTradeRes.data?.data || skilledPerTradeRes.data || {};
      const mostBookedData = mostBookedRes.data?.data || mostBookedRes.data || {};
      const totalsOverTimeData = totalsOverTimeRes.data?.data || totalsOverTimeRes.data || { labels: [], values: [] };

      const totalBookings = typeof mostBookedData === 'object' && mostBookedData !== null
        ? Object.values(mostBookedData)
            .filter(val => typeof val === 'number')
            .reduce((a, b) => a + b, 0)
        : 0;

      const popularServices = typeof mostBookedData === 'object' && mostBookedData !== null
        ? Object.entries(mostBookedData)
            .filter(([service, count]) => typeof count === 'number')
            .map(([service, count]) => ({ service, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        : [];

      setAnalyticsData({
        totals: totalsData,
        demographics: demographicsData,
        skills: skillsData,
        skilledPerTrade: skilledPerTradeData,
        mostBookedServices: mostBookedData,
        totalsOverTime: totalsOverTimeData,
        activeUsers: Math.floor((totalsData?.totalUsers || 0) * 0.7),
        totalBookings,
        popularServices
      });

      toast.success("Analytics data loaded successfully!");
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load analytics data";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = () => {
    const { totals, demographics, skills, popularServices, totalsOverTime } = analyticsData;

    // Calculate key metrics
    const employmentRate = (() => {
      const worker = demographics.employment?.worker || 0;
      const nonWorker = demographics.employment?.nonWorker || 0;
      const total = worker + nonWorker;
      return total > 0 ? (worker / total) * 100 : 0;
    })();

    const growthRate = totalsOverTime.values.length > 1 ?
      ((totalsOverTime.values[totalsOverTime.values.length - 1] - totalsOverTime.values[totalsOverTime.values.length - 2]) /
       (totalsOverTime.values[totalsOverTime.values.length - 2] || 1)) * 100 : 0;

    const topSkills = Object.entries(skills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topServices = popularServices.slice(0, 5);

    // Generate barangay projects recommendations
    const barangayProjects = [];

    // Infrastructure projects based on popular services
    if (topServices.some(s => s.service.toLowerCase().includes('repair') || s.service.toLowerCase().includes('maintenance'))) {
      barangayProjects.push({
        title: "Community Maintenance Hub",
        description: "Establish a centralized facility for equipment repair and maintenance services",
        priority: "High",
        impact: "Economic",
        rationale: `${topServices.find(s => s.service.toLowerCase().includes('repair') || s.service.toLowerCase().includes('maintenance'))?.count || 0} repair service bookings indicate strong demand`,
        estimatedCost: "₱500,000 - ₱1,000,000",
        timeline: "6-12 months",
        icon: FaTools
      });
    }

    // Digital literacy projects
    if (growthRate > 10) {
      barangayProjects.push({
        title: "Digital Skills Center",
        description: "Create a community center for digital literacy and online service access",
        priority: "High",
        impact: "Educational",
        rationale: `${growthRate.toFixed(1)}% user growth indicates need for digital skills development`,
        estimatedCost: "₱300,000 - ₱600,000",
        timeline: "3-6 months",
        icon: FaChartLine
      });
    }

    // Employment-focused projects
    if (employmentRate < 50) {
      barangayProjects.push({
        title: "Skills Training Center",
        description: "Build a dedicated facility for vocational training and skill development programs",
        priority: "Critical",
        impact: "Economic",
        rationale: `Only ${employmentRate.toFixed(1)}% employment rate suggests urgent need for job training`,
        estimatedCost: "₱1,000,000 - ₱2,000,000",
        timeline: "12-18 months",
        icon: FaBuilding
      });
    }

    // Community service projects
    barangayProjects.push({
      title: "Multi-Service Community Center",
      description: "Develop a comprehensive center offering various community services under one roof",
      priority: "Medium",
      impact: "Social",
      rationale: `${totals.totalUsers?.toLocaleString() || 0} users and ${popularServices.length} service types indicate need for centralized services`,
      estimatedCost: "₱2,000,000 - ₱3,000,000",
      timeline: "18-24 months",
      icon: FaHandshake
    });

    // Generate skills training recommendations
    const skillsTraining = [];

    // Based on employment gap
    if (employmentRate < 60) {
      skillsTraining.push({
        title: "Unemployment Reduction Program",
        description: "Comprehensive training program targeting unemployed residents with high-demand skills",
        targetAudience: "Unemployed adults (18-45)",
        duration: "6 months",
        expectedParticipants: Math.floor((demographics.employment?.nonWorker || 0) * 0.3),
        priority: "Critical",
        rationale: `${(100 - employmentRate).toFixed(1)}% unemployment rate requires immediate intervention`,
        skills: topSkills.slice(0, 3).map(([skill]) => skill),
        icon: FaUsers
      });
    }

    // Based on popular services
    if (topServices.length > 0) {
      skillsTraining.push({
        title: "Service Provider Upskilling",
        description: "Advanced training for existing service providers to improve quality and expand services",
        targetAudience: "Current service providers",
        duration: "3 months",
        expectedParticipants: Math.floor(totals.serviceProviders * 0.4),
        priority: "High",
        rationale: `${topServices[0]?.count || 0} bookings in top service indicate opportunity for specialization`,
        skills: [topServices[0]?.service, ...topSkills.slice(0, 2).map(([skill]) => skill)],
        icon: FaTools
      });
    }

    // Digital skills training
    skillsTraining.push({
      title: "Digital Literacy & Online Services",
      description: "Training program for basic computer skills, online platforms, and digital service access",
      targetAudience: "All residents (16+)",
      duration: "2 months",
      expectedParticipants: Math.floor(totals.totalUsers * 0.6),
      priority: "Medium",
      rationale: "Platform growth suggests increasing need for digital competencies",
      skills: ["Computer Basics", "Online Safety", "Digital Communication"],
      icon: FaChartLine
    });

    // Entrepreneurship training
    if (totals.serviceProviders < totals.totalUsers * 0.1) {
      skillsTraining.push({
        title: "Entrepreneurship Development",
        description: "Business skills training to encourage service provider entrepreneurship",
        targetAudience: "Aspiring entrepreneurs",
        duration: "4 months",
        expectedParticipants: Math.floor(totals.totalUsers * 0.15),
        priority: "Medium",
        rationale: `Only ${((totals.serviceProviders / totals.totalUsers) * 100).toFixed(1)}% are service providers, indicating growth potential`,
        skills: ["Business Planning", "Financial Management", "Marketing"],
        icon: FaProjectDiagram
      });
    }

    // Generate community programs
    const communityPrograms = [];

    communityPrograms.push({
      title: "Youth Skills Development Initiative",
      description: "Age-appropriate training programs for young residents entering the workforce",
      targetGroup: "Youth (16-25)",
      focus: "Career preparation and skill building",
      duration: "Ongoing",
      rationale: `${Object.entries(demographics.ageGroups).find(([age]) => age.includes('18-25'))?.[1] || 0} young users need career guidance`,
      icon: FaGraduationCap
    });

    communityPrograms.push({
      title: "Senior Citizen Digital Inclusion",
      description: "Specialized programs to help elderly residents access digital services",
      targetGroup: "Seniors (60+)",
      focus: "Basic digital literacy and online service access",
      duration: "3 months",
      rationale: "Digital transformation requires inclusive programs for all age groups",
      icon: FaUsers
    });

    // Generate priority actions
    const priorityActions = [];

    if (employmentRate < 50) {
      priorityActions.push({
        action: "Launch Emergency Employment Program",
        description: "Immediate skills training for unemployed residents",
        timeline: "Start within 1 month",
        responsible: "Barangay Administration",
        priority: "Critical",
        icon: FaUsers
      });
    }

    if (growthRate > 15) {
      priorityActions.push({
        action: "Scale Digital Infrastructure",
        description: "Expand online service access and digital literacy programs",
        timeline: "Start within 2 months",
        responsible: "Technical Committee",
        priority: "High",
        icon: FaChartLine
      });
    }

    priorityActions.push({
      action: "Conduct Skills Gap Analysis",
      description: "Comprehensive assessment of community skills needs vs market demands",
      timeline: "Complete within 3 months",
      responsible: "Planning Committee",
      priority: "Medium",
      icon: FaTools
    });

    setRecommendations({
      barangayProjects,
      skillsTraining,
      communityPrograms,
      priorityActions
    });
  };

  const handleExportRecommendations = () => {
    try {
      const printWindow = window.open('', '_blank');
      const recommendationsHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SkillConnect - System Recommendations Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
            .recommendation { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .priority-critical { border-color: #dc2626; background: #fef2f2; }
            .priority-high { border-color: #ea580c; background: #fff7ed; }
            .priority-medium { border-color: #ca8a04; background: #fefce8; }
            .priority-low { border-color: #16a34a; background: #f0fdf4; }
            .metric { background: #f8fafc; padding: 10px; margin: 10px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SkillConnect System Recommendations Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Analysis Period: Last ${timeRange} months</p>
          </div>

          <div class="metric">
            <h3>Key Metrics Summary</h3>
            <p>Total Users: ${analyticsData.totals.totalUsers?.toLocaleString() || 0}</p>
            <p>Service Providers: ${analyticsData.totals.serviceProviders?.toLocaleString() || 0}</p>
            <p>Employment Rate: ${(() => {
              const worker = analyticsData.demographics.employment?.worker || 0;
              const nonWorker = analyticsData.demographics.employment?.nonWorker || 0;
              const total = worker + nonWorker;
              return total > 0 ? ((worker / total) * 100).toFixed(1) : 0;
            })()}%</p>
            <p>Total Service Bookings: ${analyticsData.totalBookings.toLocaleString()}</p>
          </div>

          <div class="section">
            <h2>🏗️ Recommended Barangay Projects</h2>
            ${recommendations.barangayProjects.map(project => `
              <div class="recommendation priority-${project.priority.toLowerCase()}">
                <h3>${project.title}</h3>
                <p><strong>Description:</strong> ${project.description}</p>
                <p><strong>Priority:</strong> ${project.priority}</p>
                <p><strong>Impact:</strong> ${project.impact}</p>
                <p><strong>Rationale:</strong> ${project.rationale}</p>
                <p><strong>Estimated Cost:</strong> ${project.estimatedCost}</p>
                <p><strong>Timeline:</strong> ${project.timeline}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>🎓 Skills Training Programs</h2>
            ${recommendations.skillsTraining.map(training => `
              <div class="recommendation priority-${training.priority.toLowerCase()}">
                <h3>${training.title}</h3>
                <p><strong>Description:</strong> ${training.description}</p>
                <p><strong>Target Audience:</strong> ${training.targetAudience}</p>
                <p><strong>Duration:</strong> ${training.duration}</p>
                <p><strong>Expected Participants:</strong> ${training.expectedParticipants}</p>
                <p><strong>Priority:</strong> ${training.priority}</p>
                <p><strong>Skills to Cover:</strong> ${training.skills.join(', ')}</p>
                <p><strong>Rationale:</strong> ${training.rationale}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>🤝 Community Programs</h2>
            ${recommendations.communityPrograms.map(program => `
              <div class="recommendation">
                <h3>${program.title}</h3>
                <p><strong>Description:</strong> ${program.description}</p>
                <p><strong>Target Group:</strong> ${program.targetGroup}</p>
                <p><strong>Focus:</strong> ${program.focus}</p>
                <p><strong>Duration:</strong> ${program.duration}</p>
                <p><strong>Rationale:</strong> ${program.rationale}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>⚡ Priority Actions</h2>
            ${recommendations.priorityActions.map(action => `
              <div class="recommendation priority-${action.priority.toLowerCase()}">
                <h3>${action.action}</h3>
                <p><strong>Description:</strong> ${action.description}</p>
                <p><strong>Timeline:</strong> ${action.timeline}</p>
                <p><strong>Responsible:</strong> ${action.responsible}</p>
                <p><strong>Priority:</strong> ${action.priority}</p>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(recommendationsHTML);
      printWindow.document.close();
      printWindow.print();

      toast.success("Recommendations report opened for printing!");
    } catch (error) {
      console.error('Export failed:', error);
      toast.error("Failed to export recommendations");
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <div>
            <h1>System Recommendations</h1>
            <p className="header-description">AI-powered insights for barangay development...</p>
          </div>
        </div>
        <div className="analytics-card loading-card">
          <div className="loading-wrapper">
            <div className="loader"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <div>
            <h1>System Recommendations</h1>
            <p className="header-description">Error loading analytics data</p>
          </div>
        </div>
        <div className="analytics-card error-card">
          <div className="error-message">
            <h3>⚠️ Error Loading Data</h3>
            <p>{error}</p>
            <button onClick={fetchAnalyticsData} className="retry-btn">
              <FaSync /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1>🤖 System Recommendations</h1>
          <p className="header-description">AI-powered insights for barangay projects and skills training based on system analytics</p>
        </div>
        <div className="header-actions">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="6">📅 Last 6 months</option>
            <option value="12">📅 Last 12 months</option>
            <option value="24">📅 Last 24 months</option>
          </select>
          <button onClick={fetchAnalyticsData} className="refresh-btn" title="Refresh data">
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Key Insights Summary */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>📊 Key Insights Driving Recommendations</h2>
          <div className="card-subinfo">Data-driven analysis summary</div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon users">
              <FaUsers />
            </div>
            <h3 className="metric-title">Employment Rate</h3>
            <p className="metric-value">
              {(() => {
                const worker = analyticsData.demographics.employment?.worker || 0;
                const nonWorker = analyticsData.demographics.employment?.nonWorker || 0;
                const total = worker + nonWorker;
                return total > 0 ? Math.round((worker / total) * 100) : 0;
              })()}%
            </p>
            <div className="metric-description">
              {(() => {
                const rate = (() => {
                  const worker = analyticsData.demographics.employment?.worker || 0;
                  const nonWorker = analyticsData.demographics.employment?.nonWorker || 0;
                  const total = worker + nonWorker;
                  return total > 0 ? (worker / total) * 100 : 0;
                })();
                return rate < 50 ? "Critical - Immediate action needed" : rate < 70 ? "Moderate - Improvement needed" : "Good - Monitor and maintain";
              })()}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon bookings">
              <FaTools />
            </div>
            <h3 className="metric-title">Top Service Demand</h3>
            <p className="metric-value">{analyticsData.popularServices[0]?.service || 'N/A'}</p>
            <div className="metric-description">{analyticsData.popularServices[0]?.count || 0} bookings</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon growth">
              <FaChartLine />
            </div>
            <h3 className="metric-title">User Growth</h3>
            <p className="metric-value">
              {analyticsData.totalsOverTime.values.length > 1 ?
                Math.round(((analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 1] -
                           analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2]) /
                          (analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2] || 1)) * 100) : 0}%
            </p>
            <div className="metric-description">Monthly growth rate</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon skills">
              <FaGraduationCap />
            </div>
            <h3 className="metric-title">Skills Diversity</h3>
            <p className="metric-value">{Object.keys(analyticsData.skills).length}</p>
            <div className="metric-description">Available skill categories</div>
          </div>
        </div>
      </div>

      {/* Barangay Projects Recommendations */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>🏗️ Recommended Barangay Projects</h2>
          <div className="card-subinfo">Infrastructure and facility development based on community needs</div>
        </div>
        <div className="recommendations-grid">
          {recommendations.barangayProjects.map((project, index) => (
            <div key={index} className={`recommendation-card priority-${project.priority.toLowerCase()}`}>
              <div className="recommendation-header">
                <project.icon className="recommendation-icon" />
                <div className="recommendation-priority">{project.priority}</div>
              </div>
              <h3 className="recommendation-title">{project.title}</h3>
              <p className="recommendation-description">{project.description}</p>
              <div className="recommendation-details">
                <div className="detail-item">
                  <strong>Impact:</strong> {project.impact}
                </div>
                <div className="detail-item">
                  <strong>Cost:</strong> {project.estimatedCost}
                </div>
                <div className="detail-item">
                  <strong>Timeline:</strong> {project.timeline}
                </div>
              </div>
              <div className="recommendation-rationale">
                <strong>Why this project:</strong> {project.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Training Recommendations */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>🎓 Skills Training Programs</h2>
          <div className="card-subinfo">Education and training initiatives to address skills gaps</div>
        </div>
        <div className="recommendations-grid">
          {recommendations.skillsTraining.map((training, index) => (
            <div key={index} className={`recommendation-card priority-${training.priority.toLowerCase()}`}>
              <div className="recommendation-header">
                <training.icon className="recommendation-icon" />
                <div className="recommendation-priority">{training.priority}</div>
              </div>
              <h3 className="recommendation-title">{training.title}</h3>
              <p className="recommendation-description">{training.description}</p>
              <div className="recommendation-details">
                <div className="detail-item">
                  <strong>Target:</strong> {training.targetAudience}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {training.duration}
                </div>
                <div className="detail-item">
                  <strong>Participants:</strong> {training.expectedParticipants}
                </div>
              </div>
              <div className="training-skills">
                <strong>Skills:</strong> {training.skills.join(', ')}
              </div>
              <div className="recommendation-rationale">
                <strong>Why this program:</strong> {training.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Programs */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>🤝 Community Programs</h2>
          <div className="card-subinfo">Inclusive programs for different community segments</div>
        </div>
        <div className="recommendations-grid">
          {recommendations.communityPrograms.map((program, index) => (
            <div key={index} className="recommendation-card">
              <div className="recommendation-header">
                <program.icon className="recommendation-icon" />
                <div className="recommendation-priority">Ongoing</div>
              </div>
              <h3 className="recommendation-title">{program.title}</h3>
              <p className="recommendation-description">{program.description}</p>
              <div className="recommendation-details">
                <div className="detail-item">
                  <strong>Target Group:</strong> {program.targetGroup}
                </div>
                <div className="detail-item">
                  <strong>Focus:</strong> {program.focus}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {program.duration}
                </div>
              </div>
              <div className="recommendation-rationale">
                <strong>Why this program:</strong> {program.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Actions */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>⚡ Priority Actions</h2>
          <div className="card-subinfo">Immediate steps to implement recommendations</div>
        </div>
        <div className="priority-actions-list">
          {recommendations.priorityActions.map((action, index) => (
            <div key={index} className={`priority-action priority-${action.priority.toLowerCase()}`}>
              <div className="action-header">
                <action.icon className="action-icon" />
                <div className="action-priority">{action.priority}</div>
              </div>
              <div className="action-content">
                <h3 className="action-title">{action.action}</h3>
                <p className="action-description">{action.description}</p>
                <div className="action-meta">
                  <span className="action-timeline">⏰ {action.timeline}</span>
                  <span className="action-responsible">👤 {action.responsible}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Actions */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>📋 Export & Actions</h2>
          <div className="card-subinfo">Download recommendations and access detailed reports</div>
        </div>
        <div className="actions-grid">
          <button className="export-btn" onClick={handleExportRecommendations}>
            <FaDownload /> Export Recommendations Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemRecommendations;
