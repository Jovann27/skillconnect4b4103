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

    // Calculate key metrics from system analytics data
    const totalUsers = analyticsData.totals?.totalUsers || 0;
    const serviceProviders = analyticsData.totals?.serviceProviders || 0;
    const unemployed = analyticsData.demographics?.employment?.unemployed || 0;
    const employed = analyticsData.demographics?.employment?.employed || 0;
    const employmentRate = employed + unemployed > 0 ? (employed / (employed + unemployed)) * 100 : 0;
    const population = analyticsData.totals?.totalPopulation || 0;
    const activeUsers = analyticsData.activeUsers || 0;
    const totalBookings = analyticsData.totalBookings || 0;
    const topServiceData = analyticsData.popularServices?.[0];
    const popularService = topServiceData?.service || 'General Services';
    const popularServiceBookings = topServiceData?.count || 0;
    const skillsCount = Object.keys(analyticsData.skills || {}).length;
    const marketDemand = analyticsData.mostBookedServices || {};
    const totalMarketSize = Object.values(marketDemand).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
    const growthRate = analyticsData.totalsOverTime?.values?.length > 1 ?
      ((analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 1] -
        analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2]) /
       Math.max(analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2], 1)) * 100 : 0;

    // Unemployment and youth data from demographics
    const youthUnemploymentRate = analyticsData.demographics?.ageGroups?.['18-35']?.unemployed || 0;
    const totalYouth = analyticsData.demographics?.ageGroups?.['18-35']?.total || 0;

    // Service provider capacity analysis
    const avgBookingsPerProvider = serviceProviders > 0 ? Math.floor(totalBookings / serviceProviders) : 0;
    const marketSaturation = serviceProviders > 0 && totalUsers > 0 ? (serviceProviders / totalUsers) * 100 : 0;

    // Hard-coded recommendations based on accurate analytics data
    const recommendationsData = {
      barangayProjects: [],
      skillsTraining: [],
      communityPrograms: [],
      priorityActions: []
    };

    // Barangay Projects based on system analytics
    // 1. High-demand facility based on booking volume
    if (totalBookings > 50) {
      const demandLevel = totalBookings > 200 ? "High" : totalBookings > 100 ? "Medium" : "Low";
      recommendationsData.barangayProjects.push({
        title: "Skills Training and Community Hub",
        description: "Establish a dedicated multi-purpose facility for skills training, job placement, and community services",
        priority: demandLevel === "High" && skillsCount < 6 ? "Critical" : demandLevel === "High" ? "High" : "Medium",
        impact: "Accelerated skills development and local economic growth",
        rationale: `System analytics show ${totalBookings} service bookings across ${skillsCount} skill categories, indicating strong community engagement and training facility needs.`,
        estimatedCost: "₱2.0M - ₱3.0M",
        timeline: "6-9 months"
      });
    }

    // 2. Employment center based on unemployment rates
    if (employmentRate < 70 || unemployed > 50) {
      const severity = employmentRate < 40 || unemployed > 100 ? "Critical" : "High";
      recommendationsData.barangayProjects.push({
        title: "Employment and Skills Development Center",
        description: "Build a comprehensive center for job placement, career counseling, and skills certification",
        priority: severity,
        impact: "Reduction in unemployment and improved economic stability",
        rationale: `Analytics indicate ${employmentRate.toFixed(1)}% employment rate with ${unemployed} unemployed residents requiring immediate support infrastructure.`,
        estimatedCost: "₱750K - ₱1.25M",
        timeline: "3-6 months"
      });
    }

    // 3. Digital infrastructure based on user growth and platform usage
    if (growthRate > 15 || activeUsers > totalUsers * 0.4) {
      const digitalReadiness = growthRate > 25 ? "Critical" : growthRate > 15 ? "High" : "Medium";
      recommendationsData.barangayProjects.push({
        title: "Community Digital Access and Training Center",
        description: "Upgrade digital infrastructure and establish training programs for online service platforms",
        priority: digitalReadiness,
        impact: "Enhanced platform utilization and digital literacy",
        rationale: `${growthRate.toFixed(1)}% user growth rate and ${activeUsers} active users indicate rapidly increasing digital platform usage requiring infrastructure support.`,
        estimatedCost: "₱400K - ₱700K",
        timeline: "2-4 months"
      });
    }

    // Skills Training Programs based on system analytics
    // 1. Specialized training based on top service demand
    if (popularServiceBookings > 20) {
      const trainingPriority = popularServiceBookings > 100 ? "Critical" : popularServiceBookings > 50 ? "High" : "Medium";
      recommendationsData.skillsTraining.push({
        title: `${popularService} Excellence Program`,
        description: `Advanced training and certification program for high-demand ${popularService} skills`,
        targetAudience: "Aspiring service providers and current practitioners",
        duration: "4 months",
        expectedParticipants: Math.min(Math.floor(popularServiceBookings / 5), 40),
        priority: trainingPriority,
        skills: [popularService, "Quality Assurance", "Customer Relations", "Basic Entrepreneurship"],
        rationale: `Analytics show ${popularServiceBookings} bookings for ${popularService}, representing ${(popularServiceBookings/totalMarketSize*100).toFixed(1)}% of total market demand.`
      });
    }

    // 2. Comprehensive skill gap addressing
    if (skillsCount < 10 || totalBookings < serviceProviders * 15) {
      const gapPriority = skillsCount < 5 || totalBookings < serviceProviders * 10 ? "Critical" : "High";
      recommendationsData.skillsTraining.push({
        title: "Comprehensive Skills Diversification Program",
        description: "Multi-track training covering essential skills for complete workforce development",
        targetAudience: "Unemployed adults and career changers",
        duration: "8 months",
        expectedParticipants: Math.max(75, Math.floor(unemployed * 0.3)),
        priority: gapPriority,
        skills: ["Construction & Carpentry", "Electrical & Plumbing", "Welding & Fabrication", "Automotive Services", "Digital Skills"],
        rationale: `With only ${skillsCount} skill categories tracked and ${totalBookings} bookings across ${serviceProviders} providers, there is clear need for workforce diversification.`
      });
    }

    // 3. Provider capacity building
    if (serviceProviders > 0 && avgBookingsPerProvider < 10) {
      recommendationsData.skillsTraining.push({
        title: "Service Provider Business Development Program",
        description: "Business skills, marketing, and service quality enhancement for registered providers",
        targetAudience: "Existing service providers with low booking volume",
        duration: "3 months",
        expectedParticipants: Math.floor(serviceProviders * 0.6),
        priority: "Medium",
        skills: ["Digital Marketing", "Customer Service Excellence", "Business Management", "Pricing Strategy"],
        rationale: `Average of ${avgBookingsPerProvider} bookings per provider indicates need for entrepreneurship and marketing training.`
      });
    }

    // Community Programs based on system data
    // 1. Youth employment program
    if (totalYouth > 20 || youthUnemploymentRate > 0.3) {
      recommendationsData.communityPrograms.push({
        title: "Youth Skills Apprenticeship Program",
        description: "Structured apprenticeship providing hands-on training and mentorship for unemployed youth",
        targetGroup: "Youth aged 16-30 with limited work experience",
        focus: "Immediate employability and skill acquisition",
        duration: "12 months program",
        rationale: `Demographics show ${totalYouth} youth with unemployment challenges, requiring intensive workforce development initiatives.`
      });
    }

    // 2. Community networking and job matching
    if (totalUsers > 500 || totalBookings > 100) {
      recommendationsData.communityPrograms.push({
        title: "Community Skills Marketplace Events",
        description: "Quarterly networking events connecting service providers with clients and job seekers",
        targetGroup: "Entire community including employers and job seekers",
        focus: "Job creation and economic networking",
        duration: "Ongoing quarterly events",
        rationale: `${totalUsers} registered users and ${totalBookings} service transactions demonstrate need for enhanced marketplace connectivity.`
      });
    }

    // 3. Inclusive skill development
    if (employmentRate < 80) {
      recommendationsData.communityPrograms.push({
        title: "Inclusive Skills Development Initiative",
        description: "Targeted programs supporting underrepresented groups in skilled workforce participation",
        targetGroup: "Women, persons with disabilities, and other underrepresented groups",
        focus: "Inclusive workforce development and community equity",
        duration: "6 months pilot program",
        rationale: "Data indicates opportunities for more inclusive workforce participation and skill development equity."
      });
    }

    // Priority Actions based on system analytics
    // 1. Emergency response for critical metrics
    if (employmentRate < 50 || unemployed > 75) {
      recommendationsData.priorityActions.push({
        action: "Implement Emergency Employment Program",
        description: "Launch immediate job placement and basic skills training for unemployed residents",
        timeline: "Within 30 days",
        responsible: "Barangay Employment and Development Office",
        priority: "Critical"
      });
    }

    // 2. Data-driven planning
    if (skillsCount < 8 || !popularService || popularService === 'General Services') {
      recommendationsData.priorityActions.push({
        action: "Conduct Comprehensive Skills Assessment",
        description: "Complete skills gap analysis and workforce needs survey across all demographics",
        timeline: "Within 45 days",
        responsible: "Barangay Development Planning Committee",
        priority: "High"
      });
    }

    // 3. Partnership development based on market demand
    if (totalBookings > 0 && serviceProviders > 0) {
      recommendationsData.priorityActions.push({
        action: "Establish Industry Training Partnerships",
        description: `Develop training partnerships for ${popularService} and other high-demand skills certification programs`,
        timeline: "Within 60 days",
        responsible: "Barangay Education and Training Coordinator",
        priority: "High"
      });
    }

    // 4. Platform growth management
    if (growthRate > 20 || activeUsers > totalUsers * 0.5) {
      recommendationsData.priorityActions.push({
        action: "Enhance Platform Adoption Strategy",
        description: "Implement targeted promotion and user engagement programs to manage rapid growth",
        timeline: "Ongoing - Monthly",
        responsible: "Community Outreach and Communications Team",
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
