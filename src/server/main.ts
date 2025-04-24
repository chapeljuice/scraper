import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";
import { updateSheet } from '../client/utils/index.ts';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3000;

// Store active clients for progress updates
const activeClients = new Map();

app.get("/scrape-progress", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const clientId = req.query.clientId as string;
  if (!clientId) {
    res.end();
    return;
  }

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Store the response object
  activeClients.set(clientId, res);

  // Remove client when connection closes
  req.on('close', () => {
    activeClients.delete(clientId);
  });
});

// Helper function to send progress updates
function sendProgressUpdate(clientId: string, message: string, progress?: number) {
  const client = activeClients.get(clientId);
  if (client) {
    try {
      client.write(`data: ${JSON.stringify({ type: 'progress', message, progress })}\n\n`);
      console.log(`Progress update sent to ${clientId}:`, { message, progress });
    } catch (error) {
      console.error('Error sending progress update:', error);
      // Remove the client if we can't send updates
      activeClients.delete(clientId);
    }
  }
}

app.post("/scrape", async (req, res) => {
  try {
    const { selectedOptions } = req.body;

    if (!selectedOptions || !Array.isArray(selectedOptions)) {
      return res.status(400).json({ success: false, message: "Invalid selection." });
    }

    console.log("Attempting to scrape selected client ids: ", selectedOptions);

    // Generate a unique ID for this scraping session
    const sessionId = Date.now().toString();

    // Send initial progress update
    sendProgressUpdate(sessionId, 'Starting scraping process...', 0);

    // Start the scraping process
    updateSheet(selectedOptions, (clientId, message, progress) => {
      sendProgressUpdate(sessionId, message, progress);
    });
    
    return res.status(200).json({ 
      success: true, 
      message: "Scraping started.", 
      sessionId 
    });
  } catch (error) {
    console.error("Error during scraping:", error);
    return res.status(500).json({ success: false, message: "An error occurred during scraping." });
  }
});

ViteExpress.listen(app, port, () =>
  console.log(`Server is now listening on port ${port}...`),
);
