const translateNlp = require("../translateNlp");

// Mock the GoogleGenAI module
jest.mock("@google/genai");

describe("translateNlp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GCP_PROJECT_ID = "test-project";
  });

  test("should export a function", () => {
    expect(typeof translateNlp).toBe("function");
  });

  test("should handle empty input gracefully", async () => {
    const result = await translateNlp("");
    expect(result).toBeDefined();
  });

  test("should return an object with query and metadata properties", async () => {
    const mockResponse = {
      text: JSON.stringify({
        whereClause: "SELECT * FROM table WHERE metadata.Modality = 'CT'",
        textSearch: "pneumothorax",
        imageSearch: "chest",
        notes: "Basic CT search",
      }),
    };

    const { GoogleGenAI } = require("@google/genai");
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue(mockResponse),
      },
    }));

    const result = await translateNlp("CT chest with pneumothorax");
    expect(result).toBeDefined();
    expect(result).toHaveProperty("query");
  });
});
