const express = require("express");
const { BigQuery } = require("@google-cloud/bigquery");
const cors = require("cors");
const dotenv = require("dotenv");
const translateNlp = require("./translateNlp");

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes (adjust for production)
app.use(express.json()); // Parse JSON request bodies

// Configure BigQuery
const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
});

// API Endpoint
app.post("/api/query", async (req, res) => {
  const { textInput } = req.body;

  if (!textInput) {
    return res.status(400).json({ message: "textInput is required." });
  }

  try {
    const query = await translateNlp(textInput);
    console.log("Generated Query:", query);

    if (!query) {
      return res.status(400).json({ message: "Failed to generate query." });
    }

    const options = {
      query,
      location: "US", // Specify your BigQuery dataset location
    };

    // Run the query
    const [rows] = await bigquery.query(options);
    const result = { rows, query };

    console.log("BigQuery Query Results:", rows);
    res.json(result); // Send the results as JSON to the client
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Failed to query BigQuery.", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
