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



  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📊 Fetching analytics data with timeRange:', timeRange);
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

      console.log('📊 Totals:', totalsRes.data);
      console.log('📊 Demographics:', demographicsRes.data);
      console.log('📊 Skills:', skillsRes.data);
      console.log('📊 SkilledPerTrade:', skilledPerTradeRes.data);
      console.log('📊 MostBooked:', mostBookedRes.data);
      console.log('📊 TotalsOverTime:', totalsOverTimeRes.data);

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

      const newAnalyticsData = {
        totals: totalsData,
        demographics: demographicsData,
        skills: skillsData,
        skilledPerTrade: skilledPerTradeData,
        mostBookedServices: mostBookedData,
        totalsOverTime: totalsOverTimeData,
        activeUsers: Math.floor((totalsData?.totalUsers || 0) * 0.7),
        totalBookings,
        popularServices
      };

      console.log('📦 Complete Analytics Data:', newAnalyticsData);
      console.log('📦 Total Users:', newAnalyticsData.totals?.totalUsers);

      setAnalyticsData(newAnalyticsData);

      // Generate recommendations based on analytics data
      console.log('✨ Generating recommendations after data load...');
      generateRecommendations();

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
    console.log('📊 Generating hard-coded recommendations based on analytics data');

    // Calculate key metrics
    const totalUsers = analyticsData.totals?.totalUsers || 0;
    const serviceProviders = analyticsData.totals?.serviceProviders || 0;
    const worker = analyticsData.demographics?.employment?.worker || 0;
    const nonWorker = analyticsData.demographics?.employment?.nonWorker || 0;
    const employmentRate = worker + nonWorker > 0 ? (worker / (worker + nonWorker)) * 100 : 0;
    const totalBookings = analyticsData.totalBookings || 0;
    const popularService = analyticsData.popularServices?.[0]?.service || 'N/A';
    const skillsCount = Object.keys(analyticsData.skills || {}).length;
    const userGrowth = analyticsData.totalsOverTime?.values?.length > 1 ?
      ((analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 1] -
        analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2]) /
       (analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2] || 1)) * 100 : 0;

    // Hard-coded recommendations based on data analysis
    const recommendationsData = {
      barangayProjects: [],
      skillsTraining: [],
      communityPrograms: [],
      priorityActions: []
    };

    // Barangay Projects based on metrics
    if (totalBookings > 100) {
      recommendationsData.barangayProjects.push({
        title: "Community Skills Hub Construction",
        description: "Build a dedicated facility for skills training and community workshops",
        priority: skillsCount < 5 ? "Critical" : "High",
        impact: "High community engagement and skill development",
        rationale: `With ${totalBookings} total bookings, there's strong demand for service skills that require a centralized learning space.`,
        estimatedCost: "₱2.5M - ₱3.5M",
        timeline: "6-9 months"
      });
    }

    if (employmentRate < 60) {
      recommendationsData.barangayProjects.push({
        title: "Employment Support Center",
        description: "Establish a barangay employment assistance and job placement center",
        priority: employmentRate < 40 ? "Critical" : "High",
        impact: "Direct improvement in employment rates and economic stability",
        rationale: `Current employment rate of ${employmentRate.toFixed(1)}% requires immediate infrastructure to support job seekers.`,
        estimatedCost: "₱800K - ₱1.2M",
        timeline: "3-6 months"
      });
    }

    if (userGrowth > 20) {
      recommendationsData.barangayProjects.push({
        title: "Digital Infrastructure Upgrade",
        description: "Upgrade community internet and digital access to support platform growth",
        priority: "Medium",
        impact: "Enhanced digital literacy and platform accessibility",
        rationale: `${userGrowth.toFixed(1)}% monthly user growth indicates need for better digital infrastructure.`,
        estimatedCost: "₱500K - ₱800K",
        timeline: "2-4 months"
      });
    }

    // Skills Training Programs
    if (popularService !== 'N/A' && totalBookings > 50) {
      recommendationsData.skillsTraining.push({
        title: `${popularService} Advanced Training Program`,
        description: `Specialized training for ${popularService} service providers to meet community demand`,
        targetAudience: "Unemployed youth and existing service providers",
        duration: "3 months",
        expectedParticipants: Math.min(Math.floor(totalBookings / 10), 50),
        priority: employmentRate < 50 ? "Critical" : "High",
        skills: [popularService, "Customer Service", "Business Management"],
        rationale: `${popularService} has the highest demand with ${analyticsData.popularServices?.[0]?.count || 0} bookings, indicating workforce needs.`
      });
    }

    if (skillsCount < 8) {
      recommendationsData.skillsTraining.push({
        title: "Multi-Skill Development Program",
        description: "Comprehensive training covering multiple in-demand skills for job diversification",
        targetAudience: "Unemployed residents aged 18-35",
        duration: "6 months",
        expectedParticipants: 100,
        priority: skillsCount < 4 ? "Critical" : "High",
        skills: ["Basic Electrical", "Plumbing", "Carpentry", "Welding", "Automotive"],
        rationale: `Only ${skillsCount} skill categories available indicates significant skills gap that needs addressing.`
      });
    }

    recommendationsData.skillsTraining.push({
      title: "Digital Skills for Service Providers",
      description: "Training in digital tools, online marketing, and platform utilization for service businesses",
      targetAudience: "Registered service providers",
      duration: "2 months",
      expectedParticipants: Math.floor(serviceProviders * 0.8),
      priority: "Medium",
      skills: ["Digital Marketing", "Online Presence", "Platform Navigation"],
      rationale: `With ${serviceProviders} service providers, digital skills training will enhance business opportunities.`
    });

    // Community Programs
    recommendationsData.communityPrograms.push({
      title: "Youth Apprenticeship Mentorship",
      description: "Pair unemployed youth with experienced service providers for hands-on learning",
      targetGroup: "Youth aged 16-25 seeking employment",
      focus: "Practical skill acquisition through mentorship",
      duration: "1 year program",
      rationale: `Employment rate of ${employmentRate.toFixed(1)}% suggests need for youth employment initiatives.`
    });

    if (totalUsers > 1000) {
      recommendationsData.communityPrograms.push({
        title: "Regular Skills Fair and Job Matching Events",
        description: "Monthly events connecting service providers with potential clients and job seekers",
        targetGroup: "All community members",
        focus: "Job creation and service utilization",
        duration: "Ongoing quarterly events",
        rationale: `Growing community of ${totalUsers} users supports regular networking and job matching activities.`
      });
    }

    recommendationsData.communityPrograms.push({
      title: "Women's Skills Empowerment Program",
      description: "Specialized training and support for women entering skilled trades",
      targetGroup: "Women interested in skilled trades",
      focus: "Gender-inclusive skill development",
      duration: "6 months program",
      rationale: "Promoting gender equality in skilled professions and addressing potential workforce gaps."
    });

    // Priority Actions
    if (employmentRate < 50) {
      recommendationsData.priorityActions.push({
        action: "Launch Emergency Employment Initiative",
        description: "Immediate job placement program for unemployed residents with basic skills training",
        timeline: "Within 30 days",
        responsible: "Barangay Employment Officer",
        priority: "Critical"
      });
    }

    recommendationsData.priorityActions.push({
      action: "Conduct Skills Gap Analysis Survey",
      description: "Comprehensive survey to identify specific skills shortages and training needs",
      timeline: "Within 45 days",
      responsible: "Barangay Development Committee",
      priority: "High"
    });

    recommendationsData.priorityActions.push({
      action: "Establish Skills Training Partnership",
      description: `Partner with TESDA or private training institutions for ${popularService} certification programs`,
      timeline: "Within 60 days",
      responsible: "Barangay Administrator",
      priority: "High"
    });

    if (userGrowth > 15) {
      recommendationsData.priorityActions.push({
        action: "Scale Up Platform Promotion",
        description: "Increase community awareness campaigns and user registration drives",
        timeline: "Ongoing - Monthly",
        responsible: "Communication Team",
        priority: "Medium"
      });
    }

    // Add icons to recommendations
    const iconMap = {
      barangayProjects: [FaTools, FaChartLine, FaBuilding, FaHandshake],
      skillsTraining: [FaUsers, FaTools, FaChartLine, FaProjectDiagram],
      communityPrograms: [FaGraduationCap, FaUsers],
      priorityActions: [FaUsers, FaChartLine, FaTools]
    };

    // Add icons to each recommendation
    Object.keys(recommendationsData).forEach(category => {
      if (recommendationsData[category] && Array.isArray(recommendationsData[category])) {
        recommendationsData[category].forEach((item, index) => {
          const icons = iconMap[category] || [FaLightbulb];
          item.icon = icons[index % icons.length];
        });
      }
    });

    console.log('✅ Recommendations generated:', recommendationsData);
    setRecommendations(recommendationsData);
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
          {recommendations.barangayProjects && recommendations.barangayProjects.length > 0 ? (
            recommendations.barangayProjects.map((project, index) => {
              const Icon = project.icon;
              return (
                <div key={index} className={`recommendation-card priority-${project.priority.toLowerCase()}`}>
                  <div className="recommendation-header">
                    <Icon className="recommendation-icon" />
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
            );
          })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              <p>No barangay project recommendations available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Skills Training Recommendations */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>🎓 Skills Training Programs</h2>
          <div className="card-subinfo">Education and training initiatives to address skills gaps</div>
        </div>
        <div className="recommendations-grid">
          {recommendations.skillsTraining && recommendations.skillsTraining.length > 0 ? (
            recommendations.skillsTraining.map((training, index) => {
              const Icon = training.icon;
              return (
                <div key={index} className={`recommendation-card priority-${training.priority.toLowerCase()}`}>
                  <div className="recommendation-header">
                    <Icon className="recommendation-icon" />
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
            );
          })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              <p>No skills training recommendations available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Community Programs */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>🤝 Community Programs</h2>
          <div className="card-subinfo">Inclusive programs for different community segments</div>
        </div>
        <div className="recommendations-grid">
          {recommendations.communityPrograms && recommendations.communityPrograms.length > 0 ? (
            recommendations.communityPrograms.map((program, index) => {
              const Icon = program.icon;
              return (
                <div key={index} className="recommendation-card">
                  <div className="recommendation-header">
                    <Icon className="recommendation-icon" />
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
            );
          })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              <p>No community programs recommendations available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Priority Actions */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>⚡ Priority Actions</h2>
          <div className="card-subinfo">Immediate steps to implement recommendations</div>
        </div>
        <div className="priority-actions-list">
          {recommendations.priorityActions && recommendations.priorityActions.length > 0 ? (
            recommendations.priorityActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div key={index} className={`priority-action priority-${action.priority.toLowerCase()}`}>
                  <div className="action-header">
                    <Icon className="action-icon" />
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
            );
          })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
              <p>No priority actions available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Export Button */}
      <button className="fixed-export-btn" onClick={handleExportRecommendations} title="Export Recommendations Report">
        <FaDownload /> Export Recommendations Report
      </button>
    </div>
  );
};

export default SystemRecommendations;
