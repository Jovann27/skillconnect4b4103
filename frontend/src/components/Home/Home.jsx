import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import Mission from "./Mission";
import Announcement from "./Announcement";
import "./home-styles.css";

const Home = () => {
  
  return (
    <>
      <section className="homePage page">
        <HeroSection />
        <Announcement />
        <Mission />
        <HowItWorks />
      </section>
    </>
  );
};

export default Home;