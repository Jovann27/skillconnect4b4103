import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import Mission from "./Mission";
import Announcement from "./Announcement";
import TeamSection from "./Officials";
import "./home-styles.css";

const Home = () => {
  
  return (
    <>
      <section className="homePage page">
        <HeroSection />
        <Announcement />
        <Mission />
        <HowItWorks />
        <TeamSection />
      </section>
    </>
  );
};

export default Home;
