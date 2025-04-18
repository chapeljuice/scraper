import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";
import { updateSheet } from '../client/utils/index.ts';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3000;

app.post("/scrape", async (req, res) => {
  try {
    const { selectedOptions } = req.body;

    if (!selectedOptions || !Array.isArray(selectedOptions)) {
      return res.status(400).json({ success: false, message: "Invalid selection." });
    }

    console.log("Attempting to scrape selected client ids: ", selectedOptions);

    await updateSheet(selectedOptions); // Ensure the function completes before proceeding
    
    return res.status(200).json({ success: true, message: "Scraping complete." });
  } catch (error) {
    console.error("Error during scraping:", error);
    return res.status(500).json({ success: false, message: "An error occurred during scraping." });
  }
});


ViteExpress.listen(app, port, () =>
  console.log(`Server is now listening on port ${port}...`),
);
