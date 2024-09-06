import React from "react";
import "./chatcont.css";
import logo from "../../assets/logo.jpg";

const ChatCont = ({
  messages,
  handleRadioClick,
  isAskingQuestion,
  setInput,
  sendMessage,
}) => {
  return (
    <div className="things">
      {messages.map((message, index) => (
        <div key={index} style={{ marginTop: index === 0 ? 15 : 0 }}>
          {message.text && (
            <div
              style={{
                justifyContent:
                  message.type == "text" ? "flex-start" : "flex-end",
              }}
              className="sideLogo"
            >
              <img
                src={logo}
                alt=""
                style={{
                  display: message.type == "text" ? "block" : "none",
                }}
                className="sidelogoimg"
              />
              <div
                className={
                  message.type == "text" ? "messageText" : "messageReply"
                }
              >
                {message.text.body}
              </div>
            </div>
          )}
          {message.image && (
            <img
              src={message.image.link}
              alt="Image"
              className="messageImage"
            />
          )}
          {message.radio && (
            <div className="messageButton">
              {message.radio.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleRadioClick(option)}
                  style={{
                    boxShadow:
                      message.radio.length - 1 === i
                        ? "none"
                        : "0 1px 0 rgba(0, 0, 0, 0.1)",
                    borderTopLeftRadius: i === 0 ? "15px" : "0",
                    borderTopRightRadius: i === 0 ? "15px" : "0",
                    borderBottomLeftRadius:
                      message.radio.length - 1 === i ? "15px" : "0",
                    borderBottomRightRadius:
                      message.radio.length - 1 === i ? "15px" : "0",
                    paddingTop: i === 0 ? "12px" : "8px",
                    paddingBottom:
                      message.radio.length - 1 === i ? "12.5px" : "11px",
                  }}
                >
                  {option.reply.title}
                  {/* <p className="btnTxt">{option.reply.title}</p> */}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {/* {isAskingQuestion && <div>Please type your question</div>} */}
    </div>
  );
};

export default ChatCont;
