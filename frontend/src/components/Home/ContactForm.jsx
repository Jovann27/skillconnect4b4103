const ContactForm = () => {
  return (
    <div className="contact-section">
      <div className="contact-form">
        <h3>Let's Get In Touch</h3>
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
        <img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=400&fit=crop" alt="Contact Person" />
      </div>
    </div>
  );
};

export default ContactForm;
