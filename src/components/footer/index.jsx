import React from "react";
import "./footer.css";
import send from '../../assets/sendIcon.svg';

const Footer = ({ setInput, sendMessage, input }) => {
  return (
    <div className="footer">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Type your message here..."
        className="input"
      />
      <button onClick={sendMessage}  className="sendBtn">
        <img src={send} alt="send message" className="send" />
      </button>
    </div>
  );
};

export default Footer;
