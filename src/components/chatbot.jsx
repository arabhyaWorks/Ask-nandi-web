import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [userState, setUserState] = useState({});
  const [userLanguage, setUserLanguage] = useState('en');
  const [userName, setUserName] = useState('User');
  const [interactivePayload, setInteractivePayload] = useState(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  // Log all state variables whenever they change
  useEffect(() => {
    // console.log('isAskingQuestion:', isAskingQuestion);
  }, [messages, input, sessionId, userState, userLanguage, userName, interactivePayload, isAskingQuestion]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.post('http://localhost:5000/api/flow', {
          userName,
          messageType: 'text',
          messageContent: 'hi',
          userState,
          userLanguage
        });
  
        const { headers, data } = response;
        console.log('Response data:', data);  // Log response data
        setSessionId(headers['session-id']);
        const messages = data.messages.flat();  // Flatten the array if needed
        setMessages(messages);
  
        // Check if the response should set isAskingQuestion to true
        if (data.list_reply && data.list_reply.id === 'ask_yes') {
          setIsAskingQuestion(true);
        }
  
        // Update userState based on server response if needed
        setUserState(data.userState || {});
      } catch (error) {
        console.error('Error:', error);
      }
    };
  
    fetchInitialData();
  }, [userName, userLanguage]);  // Only depend on userName and userLanguage

  const sendMessage = async () => {
    let messageType = 'text';
    let messageContent = input;

    if (interactivePayload) {
      messageType = 'interactive';
      messageContent = interactivePayload;
      setInteractivePayload(null);  // Clear the interactive payload after sending
    }

    // Update userState if asking a question
    const updatedUserState = isAskingQuestion ? { ...userState, isAskingQuestion: true } : userState;

    const payload = {
      userName,
      messageType,
      messageContent,
      userState: updatedUserState,
      userLanguage
    };

    // Check if the payload should set isAskingQuestion to true
    if (interactivePayload && interactivePayload.list_reply && interactivePayload.list_reply.id === 'ask_yes') {
      setIsAskingQuestion(true);
    }

    console.log('Sending request with payload:', payload);

    try {
      const response = await axios.post('http://localhost:5000/api/flow', payload, {
        headers: { 'session-id': sessionId }
      });

      console.log(response);

      // Reset asking question state if necessary
      if (isAskingQuestion) {
        setIsAskingQuestion(false);
      }

      setMessages(prevMessages => [...prevMessages, ...response.data.messages]);
      setInput('');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRadioClick = (option) => {
    setInput(option.reply.title);
    setInteractivePayload({ type: 'list_reply', list_reply: { id: option.reply.id } });
  };

  return (
    <div>
      <div style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px' }}>
        {messages.map((message, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            {message.text && <div>{message.text.body}</div>}
            {message.image && <img src={message.image.link} alt="Image" style={{ maxWidth: '100%' }} />}
            {message.radio && (
              <div>
                {message.radio.map((option, i) => (
                  <button key={i} onClick={() => handleRadioClick(option)} style={{ margin: '5px' }}>
                    {option.reply.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isAskingQuestion && <div>Please type your question</div>}
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message here..."
          style={{ width: '80%', padding: '10px' }}
        />
        <button onClick={sendMessage} style={{ padding: '10px' }}>Send</button>
      </div>
    </div>
  );
};

export default Chatbot;
