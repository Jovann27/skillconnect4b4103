import Officials from "./Officials";
import Mission from "./Mission";
import DevelopmentCards from "./DevelopmentCards";
import ContactForm from "./ContactForm";
import "./home-styles.css";
import "./about.css";

const About = () => {
  return (
    <section className="about-page page">
      <Officials />
      <Mission />
      <DevelopmentCards />
      <ContactForm />
    </section>
  );
};

export default About;
