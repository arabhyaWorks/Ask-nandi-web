import React from "react";
import "./chatcont.css";

const ChatCont = ({ messages, handleRadioClick, isAskingQuestion }) => {
  return (
    <div className="things">
      {messages.map((message, index) => (
        <div key={index} style={{ marginBottom: "10px" }}>
          {message.text && <div>{message.text.body}</div>}
          {message.image && (
            <img
              src={message.image.link}
              alt="Image"
              style={{ maxWidth: "100%" }}
            />
          )}
          {message.radio && (
            <div>
              {message.radio.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleRadioClick(option)}
                  style={{ margin: "5px" }}
                >
                  {option.reply.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {isAskingQuestion && <div>Please type your question</div>}
    </div>
  );
};

export default ChatCont;
