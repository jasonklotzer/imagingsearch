const express = require("express");
const { BigQuery } = require("@google-cloud/bigquery");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const translateNlp = require("./translateNlp");

dotenv.config(); // Load environment variables from .env file

// Validate required environment variables
if (!process.env.GCP_PROJECT_ID) {
  console.error("ERROR: GCP_PROJECT_ID environment variable is required but not set.");
  console.error("Please create a .env file in the web directory with GCP_PROJECT_ID=your-project-id");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes (adjust for production)
app.use(express.json()); // Parse JSON request bodies

// Configure BigQuery
const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
});

// API Endpoint (must be before static file serving)
app.post("/api/query", async (req, res) => {
  const { textInput } = req.body;
  if (!textInput) {
    return res.status(400).json({ message: "textInput is required." });
  }
  try {
    const geminiResponse = await translateNlp(textInput);
    if (!geminiResponse) {
      return res.status(400).json({ message: "Failed to generate query." });
    }
    const options = {
      query: geminiResponse.query,
      location: "US",
    };
    const [rows] = await bigquery.query(options);
    const result = { rows, geminiResponse };
    res.json(result);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Failed to query BigQuery.", error: error.message });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "./public")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// Using middleware instead of app.get for Express 5 compatibility
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
