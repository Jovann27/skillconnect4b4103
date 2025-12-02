import { FaUserPlus } from "react-icons/fa";
import { MdFindInPage } from "react-icons/md";
import { IoMdSend } from "react-icons/io";

const HowItWorks = () => {
  return (
      <>
        <div className="howitworks">
          <div className="container">
            <h3>How SkillConnect4B410 Works</h3>
            <div className="banner">
              <div className="card">
                <FaUserPlus />
                <p className="card-title">Create Account </p>
                <p>
                  Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                  Consequuntur, culpa.
                </p>
              </div>
              <div className="card">
                <MdFindInPage />
                <p>Find a Job/Post a Job</p>
                <p>
                  Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                  Consequuntur, culpa.
                </p>
              </div>
              <div className="card">
                <IoMdSend />
                <p className="card-title">Apply For Job/Recruit Suitable Candidates</p>
                <p> 
                  Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                  Consequuntur, culpa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  export default HowItWorks;
