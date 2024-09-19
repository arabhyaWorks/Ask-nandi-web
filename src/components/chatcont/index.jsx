import React from "react";
import "./chatcont.css"; // Add styling for the chat container

const ChatCont = ({ messages, handleLanguageClick, handleOptionClick }) => {
  return (
    <div className="chat-container">
      {messages.map((message, index) => (
        <div key={index} className={`message-box ${message.type}`}>
          {/* Render language options as clickable buttons */}
          {message.type === "language" && (
            <button
              className="language-btn"
              onClick={() => handleLanguageClick(message.replyId)}
            >
              {message.text.body}
            </button>
          )}

          {/* Render regular reply messages */}
          {message.type === "reply" && <div className="message-text">{message.text.body}</div>}

          {/* Render clickable buttons for options */}
          {message.type === "option" && (
            <button
              className="option-btn"
              onClick={() => handleOptionClick(message.replyId)}
            >
              {message.text.body}
            </button>
          )}

          {/* Render image */}
          {message.type === "image" && (
            <img src={message.url} alt="Temple" className="temple-image" />
          )}
        </div>
      ))}
    </div>
  );
};

export default ChatCont;
