const express = require("express");
const { BigQuery } = require("@google-cloud/bigquery");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const translateNlp = require("./translateNlp");
const { buildQuery, parseConfig } = require("./queryBuilder");
const { executeCountQuery, executePaginatedQuery, formatMetadata } = require("./bigQueryExecutor");

dotenv.config();

function createApp() {
  if (!process.env.GCP_PROJECT_ID) {
    console.error("ERROR: GCP_PROJECT_ID environment variable is required but not set.");
    console.error("Please create a .env file in the web directory with GCP_PROJECT_ID=your-project-id");
    process.exit(1);
  }

  const app = express();

  app.use(cors());
  app.use(express.json());

  const bigquery = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

  app.post("/api/query", async (req, res) => {
    const startTime = Date.now();

    try {
      // Parse and validate input
      const { textInput } = req.body;
      if (!textInput) {
        return res.status(400).json({
          error: "MISSING_INPUT",
          message: "textInput is required.",
        });
      }

      // Parse configuration from request
      const config = parseConfig(req.body);

      // Generate SQL query from natural language
      const geminiResponse = await translateNlp(textInput);
      if (!geminiResponse) {
        return res.status(400).json({
          error: "NLP_GENERATION_FAILED",
          message: "Failed to generate query from natural language input.",
        });
      }

      // Build the final SQL query based on config
      const queryBuilder = buildQuery(geminiResponse, config);

      // Handle dry-run mode - return SQL without executing
      if (config.dryRun) {
        const executionTime = Date.now() - startTime;
        return res.json({
          metadata: formatMetadata({}, "dryRun", executionTime),
          geminiResponse,
          data: [],
          sql: queryBuilder.query,
        });
      }

      // Execute the query
      let result;
      if (queryBuilder.mode === "countOnly") {
        const totalCount = await executeCountQuery(bigquery, queryBuilder.query);
        result = { totalCount };
      } else {
        result = await executePaginatedQuery(bigquery, queryBuilder.query, config);
      }

      const executionTime = Date.now() - startTime;
      const metadata = formatMetadata(result, queryBuilder.mode, executionTime);

      res.json({
        metadata,
        data: result.rows || [],
        geminiResponse,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("ERROR:", error);

      // Categorize error for client
      let errorCode = "UNKNOWN_ERROR";
      if (error.message.includes("Syntax error")) {
        errorCode = "INVALID_SQL";
      } else if (error.message.includes("Not found")) {
        errorCode = "BIGQUERY_NOT_FOUND";
      } else if (error.message.includes("timeout")) {
        errorCode = "TIMEOUT";
      }

      res.status(500).json({
        error: errorCode,
        message: "Failed to execute query.",
        details: error.message,
        executionTime: `${executionTime}ms`,
      });
    }
  });

  app.use(express.static(path.join(__dirname, "./public")));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, "./public/index.html"));
  });

  return app;
}

module.exports = createApp;
