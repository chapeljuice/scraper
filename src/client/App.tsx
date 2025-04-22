import React, { useState } from 'react';
import Select from 'react-select';
import "./App.css";
import data from '../client/data/client-structures.json';

interface ClientOption {
  value: string;
  label: string;
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<ClientOption[]>([]);

  const clientOptions: ClientOption[] = data.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  const handleSelectChange = (selected: readonly ClientOption[]) => {
    setIsLoading(false);
    setSuccess(false);
    
    // Check if the last selected option was "Select All" or "Clear All"
    const lastSelected = selected[selected.length - 1];
    if (lastSelected) {
      if (lastSelected.value === 'select-all') {
        setSelectedOptions(clientOptions);
      } else if (lastSelected.value === 'clear-all') {
        setSelectedOptions([]);
      } else {
        setSelectedOptions([...selected]);
      }
    } else {
      setSelectedOptions([]);
    }
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
        body: JSON.stringify({ selectedOptions: selectedOptions.map(option => option.value) }),
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

  // Add Select All and Clear All options to the beginning of the options array
  const optionsWithActions = [
    { value: 'select-all', label: 'Select All Clients' },
    { value: 'clear-all', label: 'Clear All Selections' },
    ...clientOptions
  ];

  return (
    <div className="App">
      <div className="logo-container">
        <img src="/studio82-logo.png" alt="Studio 82 Logo" className="logo" />
      </div>
      <h1>PMS Data Scraper</h1>
      <p>Select one or multiple clients below to update.</p>
      <p>Data will be saved in the Google Sheet associated with each client inside the <code>client-structures.json</code> file. Multiple clients can use the same <code>sheetId</code> if desired.</p>
      <p className="warning">⚠️ This may take a few moments to complete. ⚠️</p>
      <div className={`form-group ${isLoading ? 'loading' : ''}`}>
        <label htmlFor="client">Select client(s) to update:</label>
        <Select
          id="client"
          name="client"
          isMulti
          options={optionsWithActions}
          value={selectedOptions}
          onChange={handleSelectChange}
          className="react-select-container"
          classNamePrefix="react-select"
          placeholder="Select or search clients..."
          isOptionDisabled={(option) => 
            (option.value === 'select-all' && selectedOptions.length === clientOptions.length) ||
            (option.value === 'clear-all' && selectedOptions.length === 0)
          }
        />
        <div className="cta-container">
          <button onClick={handleButtonClick} disabled={isLoading || selectedOptions.length < 1} className={`${success ? 'success' : ''}`}>
            {success ? (`✅ Data Updated!`) :
              !isLoading ? (`Update Google Sheet${selectedOptions.length >1 ? 's' : ''} →`) :
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
