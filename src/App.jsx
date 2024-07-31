import { useState } from 'react';
import axios from 'axios';

function App() {
  const [userName, setUserName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [languages, setLanguages] = useState([]); // Assume this is the structure [{id: 'en', title: 'English'}, ...]

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        const response = await axios.post('http://localhost:5000/send-welcome-message', { userName }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Response data:', response.data);
        setWelcomeMessage(response.data.message);
        setLanguages(response.data.languages);
    } catch (error) {
        console.error('Error fetching welcome message:', error);
    }
};


  return (
    <div className="App">
      <h1>Welcome</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Enter your name:
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
        </label>
        <button type="submit">Submit</button>
      </form>
      <p>{welcomeMessage}</p>
      {languages.length > 0 && (
        <div>
          <p>Please select a language:</p>
          {languages.map((language) => (
            <label key={language.id}>
              <input type="radio" name="language" value={language.id} />
              {language.title}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
