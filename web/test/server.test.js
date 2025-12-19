const request = require("supertest");

// Mock modules used by the app
jest.mock("../translateNlp");
jest.mock("@google-cloud/bigquery");
jest.mock("dotenv", () => ({ config: jest.fn() }));

describe("Express Server API", () => {
  let app;
  let mockBigQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GCP_PROJECT_ID = "test-project";
    process.env.PORT = 5000;

    const translateNlp = require("../translateNlp");
    const { BigQuery } = require("@google-cloud/bigquery");

    // Prepare mock BigQuery instance and make constructor return it
    mockBigQuery = { query: jest.fn() };
    BigQuery.mockImplementation(() => mockBigQuery);

    // Default translateNlp response
    translateNlp.mockResolvedValue({
      query: "SELECT * FROM dicom_table LIMIT 50;",
      whereClause: "PatientAge BETWEEN 30 AND 50",
      vectorSearch: "emphysema",
      notes: "test notes",
    });

    // Default: return 50 rows
    mockBigQuery.query.mockResolvedValue([
      Array(50)
        .fill(null)
        .map((_, i) => ({
          PatientID: String(i + 1),
          Modality: i % 2 === 0 ? "CT" : "MRI",
          StudyDate: "2024-01-01",
        })),
    ]);

    // Import the real app
    const createApp = require("../app");
    app = createApp();
  });

  describe("Input Validation", () => {
    test("POST /api/query should require textInput", async () => {
      const response = await request(app).post("/api/query").send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("MISSING_INPUT");
      expect(response.body.message).toBe("textInput is required.");
    });

    test("POST /api/query should handle missing textInput in body", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ limit: 10 });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("MISSING_INPUT");
    });
  });

  describe("Basic Query Functionality", () => {
    test("POST /api/query should return data and geminiResponse on success", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find CT studies" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("geminiResponse");
      expect(response.body).toHaveProperty("metadata");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("POST /api/query should return structured geminiResponse", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies with emphysema" });

      expect(response.status).toBe(200);
      expect(response.body.geminiResponse).toHaveProperty("query");
      expect(response.body.geminiResponse).toHaveProperty("whereClause");
      expect(response.body.geminiResponse).toHaveProperty("textSearch");
      expect(response.body.geminiResponse).toHaveProperty("imageSearch");
    });
  });

  describe("Pagination (limit, offset)", () => {
    test("should default to limit=50 and offset=0", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(200);
      expect(response.body.metadata.limit).toBe(50);
      expect(response.body.metadata.offset).toBe(0);
      expect(response.body.metadata.rowsReturned).toBe(50);
    });

    test("should respect custom limit parameter", async () => {
      mockBigQuery.query.mockResolvedValue([
        Array(11).fill(null).map((_, i) => ({
          PatientID: String(i + 1),
          Modality: "CT",
        })),
      ]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.limit).toBe(10);
      expect(response.body.metadata.rowsReturned).toBe(10);
      expect(response.body.data.length).toBe(10);
      expect(response.body.metadata.hasMore).toBe(true);
    });

    test("should respect offset parameter for pagination", async () => {
      mockBigQuery.query.mockResolvedValue([
        Array(50).fill(null).map((_, i) => ({
          PatientID: String(i + 101),
          Modality: "MRI",
        })),
      ]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", offset: 100 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.offset).toBe(100);
    });

    test("should cap limit at maximum of 1000", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 5000 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.limit).toBe(1000);
    });

    test("should enforce minimum limit of 1", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 0 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.limit).toBe(1);
    });

    test("should handle non-numeric limit gracefully", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: "abc" });

      expect(response.status).toBe(200);
      expect(response.body.metadata.limit).toBe(50); // defaults to 50
    });

    test("should handle negative offset as 0", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", offset: -10 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.offset).toBe(0);
    });
  });

  describe("Result Metadata", () => {
    test("should include rowsReturned in metadata", async () => {
      mockBigQuery.query.mockResolvedValue([
        Array(25).fill(null).map((_, i) => ({
          PatientID: String(i),
        })),
      ]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 25 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.rowsReturned).toBe(25);
    });

    test("should correctly detect hasMore flag", async () => {
      // 51 rows means hasMore=true when limit is 50
      mockBigQuery.query.mockResolvedValue([
        Array(51).fill(null).map((_, i) => ({
          PatientID: String(i),
        })),
      ]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 50 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.hasMore).toBe(true);
      expect(response.body.data.length).toBe(50);
    });

    test("should set hasMore to false when fewer results than limit", async () => {
      mockBigQuery.query.mockResolvedValue([
        Array(25).fill(null).map((_, i) => ({
          PatientID: String(i),
        })),
      ]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 50 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.hasMore).toBe(false);
      expect(response.body.data.length).toBe(25);
    });

    test("should include executionTime in metadata", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(200);
      expect(response.body.metadata).toHaveProperty("executionTime");
      expect(typeof response.body.metadata.executionTime).toBe("string");
      expect(response.body.metadata.executionTime).toMatch(/^\d+ms$/);
    });
  });

  describe("Dry-run Mode", () => {
    test("should return SQL without executing when dryRun=true", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find CT studies", dryRun: true });

      expect(response.status).toBe(200);
      expect(response.body.metadata.dryRun).toBe(true);
      expect(response.body.data.length).toBe(0);
      expect(response.body.geminiResponse).toHaveProperty("query");
    });

    test("should not execute BigQuery when dryRun=true", async () => {
      mockBigQuery.query.mockClear();

      await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", dryRun: true });

      expect(mockBigQuery.query).not.toHaveBeenCalled();
    });

    test("should return metadata in dryRun response", async () => {
      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", dryRun: true, limit: 100 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.dryRun).toBe(true);
      expect(response.body.metadata.limit).toBe(100);
      expect(response.body.metadata).toHaveProperty("executionTime");
    });

    test("should execute normally when dryRun=false or omitted", async () => {
      mockBigQuery.query.mockClear();

      await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", dryRun: false });

      expect(mockBigQuery.query).toHaveBeenCalled();
    });
  });

  describe("Count-only Mode", () => {
    test("should return only totalCount when countOnly=true", async () => {
      // Mock BigQuery to return a single row with totalCount
      mockBigQuery.query.mockResolvedValue([[{ totalCount: 1234 }]]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find female patient studies", countOnly: true });

      expect(response.status).toBe(200);
      expect(response.body.metadata.countOnly).toBe(true);
      expect(response.body.metadata.totalCount).toBe(1234);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
      expect(response.body).toHaveProperty("geminiResponse");
    });

    test("should ignore limit/offset in countOnly mode", async () => {
      mockBigQuery.query.mockResolvedValue([[{ totalCount: 42 }]]);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find CT studies", countOnly: true, limit: 5, offset: 100 });

      expect(response.status).toBe(200);
      expect(response.body.metadata.countOnly).toBe(true);
      expect(response.body.metadata.totalCount).toBe(42);
      // Ensure no pagination metadata is present in countOnly response
      expect(response.body.metadata.limit).toBeUndefined();
      expect(response.body.metadata.offset).toBeUndefined();
      expect(response.body.metadata.hasMore).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    test("should return NLP_GENERATION_FAILED error", async () => {
      const translateNlp = require("../translateNlp");
      translateNlp.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("NLP_GENERATION_FAILED");
    });

    test("should handle BigQuery errors gracefully", async () => {
      mockBigQuery.query.mockRejectedValue(
        new Error("Syntax error in query")
      );

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("INVALID_SQL");
      expect(response.body.message).toBe("Failed to execute query.");
      expect(response.body).toHaveProperty("details");
    });

    test("should categorize BigQuery not found errors", async () => {
      mockBigQuery.query.mockRejectedValue(
        new Error("Table not found")
      );

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("BIGQUERY_NOT_FOUND");
    });

    test("should categorize timeout errors", async () => {
      mockBigQuery.query.mockRejectedValue(
        new Error("Query timeout")
      );

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("TIMEOUT");
    });

    test("should include executionTime in error response", async () => {
      mockBigQuery.query.mockRejectedValue(new Error("Query failed"));

      const response = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("executionTime");
      expect(response.body.executionTime).toMatch(/^\d+ms$/);
    });
  });

  describe("Integration Tests", () => {
    test("should handle pagination workflow", async () => {
      mockBigQuery.query.mockResolvedValue([
        Array(101).fill(null).map((_, i) => ({
          PatientID: String(i),
        })),
      ]);

      // First page
      const page1 = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 50, offset: 0 });

      expect(page1.status).toBe(200);
      expect(page1.body.data.length).toBe(50);
      expect(page1.body.metadata.hasMore).toBe(true);

      // Second page
      const page2 = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 50, offset: 50 });

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(50);
      expect(page2.body.metadata.hasMore).toBe(true);

      // Last page
      const page3 = await request(app)
        .post("/api/query")
        .send({ textInput: "Find studies", limit: 50, offset: 100 });

      expect(page3.status).toBe(200);
      expect(page3.body.data.length).toBe(1);
      expect(page3.body.metadata.hasMore).toBe(false);
    });

    test("should combine dryRun with pagination parameters", async () => {
      mockBigQuery.query.mockClear();

      const response = await request(app)
        .post("/api/query")
        .send({
          textInput: "Find studies",
          dryRun: true,
          limit: 100,
          offset: 50,
        });

      expect(response.status).toBe(200);
      expect(mockBigQuery.query).not.toHaveBeenCalled();
      expect(response.body.metadata.dryRun).toBe(true);
      expect(response.body.metadata.limit).toBe(100);
      expect(response.body.metadata.offset).toBe(50);
    });
  });
});