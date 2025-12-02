import React from "react";
import goals1 from "../About/images/goals1.png";
import goals2 from "../About/images/goals2.png";
import goals3 from "../About/images/goals3.png";
import "../About/About.css";
import "./home-styles.css";

const DevelopmentCards = () => {
  return (
    <div style={{ background: 'linear-gradient(135deg, #f8d8ea98 0%, #eca7cd83 50%, #fac0fa88 100%)', padding: '2rem 0' }}>
      <h1 className="hero-title" style={{ textAlign: 'center', fontSize: '2.5rem' }}>The People Behind the Work</h1>
      <div className="development-cards">
        <div className="dev-card">
          <img src={goals1} alt="Encourage Skill Development" />
          <h4>Encourage Skill Development</h4>
          <p>Providing continuous training and education programs to equip individuals with necessary skills.</p>
        </div>
        <div className="dev-card">
          <img src={goals2} alt="Expand Career Opportunities" />
          <h4>Expand Career Opportunities</h4>
          <p>Offering pathways for employment and advancement across various fields.</p>
        </div>
        <div className="dev-card">
          <img src={goals3} alt="Promote Sustainable Livelihood" />
          <h4>Promote Sustainable Livelihood</h4>
          <p>Supporting sustainable projects that help maintain long-term economic growth for residents.</p>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentCards;