import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import "./App.css";
import data from '../client/data/client-structures.json';

interface ClientOption {
  value: string;
  label: string;
}

interface ProgressMessage {
  type: string;
  message: string;
  progress?: number;
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<ClientOption[]>([]);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [failedClients, setFailedClients] = useState<string[]>([]);

  const clientOptions: ClientOption[] = data.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Clean up event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const handleSelectChange = (selected: readonly ClientOption[]) => {
    setIsLoading(false);
    setSuccess(false);
    setError(null);
    setFailedClients([]);
    
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

  const parseMessageForFailedClients = (message: string) => {
    // Look for patterns like "X client(s) could not be scraped: Client1, Client2."
    const failedClientsMatch = message.match(/client\(s\) could not be scraped: (.*?)\./) || 
                               message.match(/Failed clients: (.*?)\./) ||
                               message.match(/All clients failed: (.*)/);
    
    if (failedClientsMatch && failedClientsMatch[1]) {
      const clientsList = failedClientsMatch[1].split(', ');
      setFailedClients(clientsList);
      return true;
    }
    return false;
  };

  const handleButtonClick = async () => {
    setIsLoading(true);
    setSuccess(false);
    setError(null);
    setFailedClients([]);
    setProgressMessage('Initializing...');
    setProgressPercent(0);

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
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      const sessionId = data.sessionId;

      // Close any existing event source
      if (eventSource) {
        eventSource.close();
      }

      // Set up event source for progress updates
      const newEventSource = new EventSource(`/scrape-progress?clientId=${sessionId}`);
      setEventSource(newEventSource);

      newEventSource.onmessage = (event) => {
        const progressData: ProgressMessage = JSON.parse(event.data);
        if (progressData.type === 'progress') {
          setProgressMessage(progressData.message);
          if (progressData.progress !== undefined) {
            setProgressPercent(progressData.progress);
          }
          
          // Check if the message contains information about failed clients
          if (progressData.message.includes('client(s) could not be scraped') || 
              progressData.message.includes('Failed clients:') ||
              progressData.message.includes('All clients failed:')) {
            
            // Extract the failed client names
            const failedClientsMatch = progressData.message.match(/client\(s\) could not be scraped: (.*?)\./) || 
                                      progressData.message.match(/Failed clients: (.*?)\./) ||
                                      progressData.message.match(/All clients failed: (.*)/);
            
            if (failedClientsMatch && failedClientsMatch[1]) {
              const clientsList = failedClientsMatch[1].split(', ');
              setFailedClients(clientsList);
              
              // Set the error message immediately when we detect failed clients
              setError(`Some clients failed to scrape: ${clientsList.join(', ')}. Data for successful clients has been written to their respective sheets.`);
            }
          }
          
          // Only set success when we reach 100% progress
          if (progressData.progress === 100) {
            // If there were failed clients, we've already set the error
            if (failedClients.length === 0 && !progressData.message.includes('failed')) {
              setSuccess(true);
            }
            setIsLoading(false);
            newEventSource.close();
            setEventSource(null);
          }
        }
      };

      newEventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection to progress updates lost. The process may still be running.');
        newEventSource.close();
        setEventSource(null);
      };

    }
    catch (error) {
      console.error('Error during scraping:', error);
      setError('An error occurred while scraping. Please try again.');
      setIsLoading(false);
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
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
          {isLoading && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
              <p id="progressMessage" className="progress-message">{progressMessage}</p>
            </div>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {failedClients.length > 0 && !error && (
        <p className="error">
          Warning: The following clients failed to scrape: {failedClients.join(', ')}
        </p>
      )}
    </div>
  );
}

export default App;
