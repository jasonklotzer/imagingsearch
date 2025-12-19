const request = require("supertest");
const express = require("express");
const path = require("path");

// Mock modules
jest.mock("../translateNlp");
jest.mock("@google-cloud/bigquery");
jest.mock("dotenv");

describe("Express Server API", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GCP_PROJECT_ID = "test-project";
    process.env.PORT = 5000;

    // Create a fresh app instance for each test
    app = express();
    app.use(express.json());

    const translateNlp = require("../translateNlp");
    const { BigQuery } = require("@google-cloud/bigquery");

    // Mock translateNlp
    translateNlp.mockResolvedValue({
      query: "SELECT * FROM dicom_table LIMIT 10",
      metadata: { whereClause: "", textSearch: "", imageSearch: "" },
    });

    // Mock BigQuery
    const mockBigQuery = {
      query: jest.fn().mockResolvedValue([
        [
          { PatientID: "123", Modality: "CT", StudyDate: "2024-01-01" },
          { PatientID: "456", Modality: "MRI", StudyDate: "2024-01-02" },
        ],
      ]),
    };

    // Setup routes
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
        const [rows] = await mockBigQuery.query({ query: geminiResponse.query, location: "US" });
        const result = { rows, geminiResponse };
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Failed to query BigQuery.", error: error.message });
      }
    });
  });

  test("POST /api/query should require textInput", async () => {
    const response = await request(app).post("/api/query").send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("textInput is required.");
  });

  test("POST /api/query should return rows and geminiResponse on success", async () => {
    const response = await request(app)
      .post("/api/query")
      .send({ textInput: "Find CT studies" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("rows");
    expect(response.body).toHaveProperty("geminiResponse");
    expect(Array.isArray(response.body.rows)).toBe(true);
  });

  test("POST /api/query should handle errors gracefully", async () => {
    const translateNlp = require("../translateNlp");
    translateNlp.mockRejectedValue(new Error("API Error"));

    const response = await request(app)
      .post("/api/query")
      .send({ textInput: "Find CT studies" });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Failed to query BigQuery.");
  });
});
