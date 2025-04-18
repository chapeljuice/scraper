import React, { useState } from 'react';
import "./App.css";
import data from '../client/data/client-structures.json';


function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setIsLoading(false);
    setSuccess(false);
    const options = event.target.options;
    const selectedValues: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedOptions(selectedValues);
  }

  const handleButtonClick = async () => {
    setIsLoading(true);
    setSuccess(false);
    setError(null);

    if (selectedOptions.length < 1) {
      setError('Please select at least one client.');
      return;
    }

    try {
      const response = await fetch('/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedOptions }),
      });
      if (!response.ok) {
        console.log({response});
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log('Scraping started:', data);
      setSuccess(true)
    }
    catch (error) {
      console.error('Error during scraping:', error);
      setError('An error occurred while scraping. Please try again.');
    }
    finally {
      setIsLoading(false);
      setSelectedOptions([]);
    }
  }

  return (
    <div className="App">
      <h1>PMS Data Scraper</h1>
      <p>Select one or multiple clients below to update.</p>
      <p>Data will be saved in the Google Sheet associated with each client inside the <code>client-structures.json</code> file. Multiple clients can use the same <code>sheetId</code> if desired.</p>
      <p>⚠️ This may take a few moments to complete. ⚠️</p>
      <div className={`form-group ${isLoading ? 'loading' : ''}`}>
        <label htmlFor="client">Select client(s) to update:</label>
        <select id="client" name="client" value={selectedOptions} onChange={handleSelectChange} multiple>
          {data.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <div className="cta-container">
          <button onClick={handleButtonClick} disabled={isLoading || selectedOptions.length < 1} className={`${success ? 'success' : ''}`}>
            {success ? (`✅ Data Updated!`) :
              !isLoading ? (`Update Google Sheet${selectedOptions.length >1 ? 's' : ''}`) :
              isLoading && <div className="spinner"></div>
            }
          </button>
          
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default App;
