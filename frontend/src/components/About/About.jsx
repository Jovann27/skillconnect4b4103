
import "./About.css";

const About = () => {
  return (
    <div className="aboutus-container">

      {/* Header Section */}
      <div className="header-section">
        <div className="barangay-namec">Barangay 410 Zone 42</div>
        <h1 className="page-title">GALING at GANDA</h1>
        <div className="header-image">
          <img src="https://ibb.co/84MzQQf8" alt="Barangay Team" />
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <div className="description-text">
          Barangay 410 is a community located in the district of Sampaloc, Manila. Based on the 2020 Census, it had a population of 2,444 with a coverage of 0.13% of the city's total population.
        </div>
        <div className="map-container">
          <img src="https://ibb.co/MxQxQp9g" alt="Map Location" />
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="mission-vision-section">
        <div className="card mission-card">
          <h3>Mission</h3>
          <p>To provide high-quality, ethically sourced coffees in a welcoming environment where people can connect, relax, and recharge.</p>
        </div>
        <div className="card vision-card">
          <h3>Vision</h3>
          <p>To be the most loved local coffee brand known for exceptional flavor, sustainability, and community impact.</p>
        </div>
      </div>

      {/* Development Cards */}
      <div className="development-cards">
        <div className="dev-card">
          <img src="https://ibb.co/jZZQYb0h" alt="Encourage Skill Development" />
          <h4>Encourage Skill Development</h4>
          <p>Providing continuous training and education programs to equip individuals with necessary skills.</p>
        </div>
        <div className="dev-card">
          <img src="https://ibb.co/qT2wQyT" alt="Expand Career Opportunities" />
          <h4>Expand Career Opportunities</h4>
          <p>Offering pathways for employment and advancement across various fields.</p>
        </div>
        <div className="dev-card">
          <img src="https://ibb.co/rKddwgMk" alt="Promote Sustainable Livelihood" />
          <h4>Promote Sustainable Livelihood</h4>
          <p>Supporting sustainable projects that help maintain long-term economic growth for residents.</p>
        </div>
      </div>

      {/* About SkillConnect */}
      <div className="about-skillconnect">
        <h3>About SkillConnect</h3>
        <p>
          SkillConnect is a platform designed to connect skilled laborers with industries and businesses who need their services. Whether you’re a professional looking for opportunities or someone seeking reliable help, SkillConnect bridges the gap.
        </p>
        <div className="skillconnect-image">
          <img src="https://ibb.co/nsYsmHQ1" alt="SkillConnect" />
        </div>
      </div>

      {/* Contact Form */}
      <div className="contact-section">
        <div className="contact-form">
          <h3>Let’s Get In Touch</h3>
          <form>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" placeholder="Your name" />
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" placeholder="Your email" />
            <label htmlFor="message">How Can We Help?</label>
            <textarea id="message" name="message" rows="4" placeholder="Type your message here..." />
            <button type="submit" className="send-btn">Send Message</button>
          </form>
        </div>
        <div className="contact-image">
          <img src="https://ibb.co/FLCfgXNr" alt="Contact Person" />
        </div>
      </div>

      
    </div>
  );
};

export default About;
