import React, { useState, useEffect } from "react";
import "./chatbot.css";
import closeButton from "../assets/closeBtn.svg";
import logo from "../assets/logo.jpg";
import bhasiniLogo from "../assets/bhasini.png";

import ChatCont from "./chatcont";
import Footer from "./footer";
import { labels2 } from "../../labels.js"; // Adjust the path if necessary
import { languageKey } from "../../lang.js"; // Language keys for selection
import { responseLabels } from "../../constants.js"; // Import responseLabels
import axios from 'axios'; // Add axios for API requests

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("mock-session-id"); // Mock session ID
  const [userLanguage, setUserLanguage] = useState("en"); // Default language is English
  const [selectedOption, setSelectedOption] = useState(null); // Track selected service option

  // Fetch initial data including language options
  useEffect(() => {
    const fetchInitialData = () => {
      setSessionId("mock-session-id"); // Mock session ID

      const initialMessages = [
        { type: "reply", text: { body: "Hi, how are you?" } },
        { type: "reply", text: { body: "Please choose your language:" } },
      ];

      setMessages(initialMessages);

      // Display each language option in a separate message with buttons
      Object.keys(languageKey).forEach((key) => {
        const languageMessage = {
          type: "language",
          text: { body: `${languageKey[key]} (${key})` },
          replyId: `lang_${key}`, // Use this reply ID to track which language is selected
        };
        setMessages((prevMessages) => [...prevMessages, languageMessage]);
      });
    };

    fetchInitialData();
  }, []);

  // Handle language selection when a user clicks on a language
  const handleLanguageClick = (replyId) => {
    const selectedLanguage = replyId.slice(5); // Remove "lang_" prefix to get the language code
    setUserLanguage(selectedLanguage);

    // Get labels for the selected language
    const languageLabels = labels2[selectedLanguage];

    // Add confirmation and display the relevant message based on the selected language
    const confirmationMessage = {
      type: "reply",
      text: { body: `You have selected ${languageKey[selectedLanguage]} as your language.` },
    };

    const headerMessage = {
      type: "reply",
      text: { body: languageLabels.header },
    };

    const bodyMessage = {
      type: "reply",
      text: { body: languageLabels.body },
    };

    const footerMessage = {
      type: "reply",
      text: { body: languageLabels.footer },
    };

    // Collect all service options dynamically
    const optionMessages = languageLabels.options.map((option) => ({
      type: "option",
      text: { body: option.title },
      replyId: option.id, // Assign the service ID to replyId for future use
    }));

    // Add all messages (confirmation, header, body, footer, options) in one go
    setMessages((prevMessages) => [
      ...prevMessages,
      confirmationMessage,
      headerMessage,
      bodyMessage,
      footerMessage,
      ...optionMessages,
    ]);
  };

  // Handle option click (for service selection)
  const handleOptionClick = (replyId) => {
    const selectedOption = labels2[userLanguage].options.find(option => option.id === replyId);
    if (!selectedOption) {
      console.error(`Option with ID ${replyId} not found in labels2 for language ${userLanguage}`);
      return;
    }

    setSelectedOption(selectedOption);

    if (replyId === "about_temple") {
      // Handle specific case for `about_temple`
      const templeContent = responseLabels.about_temple[userLanguage];
      const imageUrl = templeContent.image; 
      const imageMessage = { type: "image", url: imageUrl };

      const contentMessages = [
        { type: "reply", text: { body: templeContent.header.join(" ") } },
        ...templeContent.temple_history.map(line => ({ type: "reply", text: { body: line } })),
        ...templeContent.about_skvt.map(line => ({ type: "reply", text: { body: line } })),
        ...templeContent.trust_officials.map(line => ({ type: "reply", text: { body: line } })),
        imageMessage,
      ];

      setMessages((prevMessages) => [...prevMessages, ...contentMessages]);
    } else {
      // General option handling
      const selectedMessage = {
        type: "reply",
        text: { body: `You have selected ${selectedOption.title}.` },
      };

      setMessages((prevMessages) => [...prevMessages, selectedMessage]);

      // Fetch response based on the selected service and language
      const responseMessages = responseLabels[replyId]?.[userLanguage] || [];
      if (responseMessages.length === 0) {
        const errorMessage = {
          type: "reply",
          text: { body: "Sorry, we couldn't find a response for this option." },
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
        return;
      }

      // Map through the array of response messages and add them individually
      const responseMessageObjects = responseMessages.map((responseLine) => ({
        type: "reply",
        text: { body: responseLine },
      }));

      setMessages((prevMessages) => [...prevMessages, ...responseMessageObjects]);
    }
  };

  // Send message (Post user input to server and fetch response)
  const sendMessage = async () => {
    if (input.trim() === "") return;
    const userMessage = { type: "reply", text: { body: input } };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      const response = await axios.post(
        "http://ec2-3-86-240-66.compute-1.amazonaws.com/ask",
        { question: input },
        { headers: { "Content-Type": "application/json" } }
      );
      const answer = response.data.answer;

      const botReply = { type: "reply", text: { body: answer } };
      setMessages((prevMessages) => [...prevMessages, botReply]);
    } catch (error) {
      console.error("Error fetching bot response:", error);
      const errorMessage = { type: "reply", text: { body: "Sorry, an error occurred while fetching the response." } };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }

    setInput(""); // Clear input field
  };

  return (
    <div className="container">
      <ChatCont 
        messages={messages} 
        handleLanguageClick={handleLanguageClick} 
        handleOptionClick={handleOptionClick} 
      />
      <Footer
        input={input}
        setInput={setInput}
        sendMessage={sendMessage} // Pass sendMessage handler to Footer
        closeButton={closeButton}
        logo={logo}
        bhasiniLogo={bhasiniLogo}
      />
    </div>
  );
};

export default Chatbot;
