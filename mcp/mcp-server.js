import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { z } from "zod/v3";

dotenv.config();

const API_URL = process.env.IMAGINGSEARCH_API_URL || "http://localhost:5000/api/query";
const API_KEY = process.env.IMAGINGSEARCH_API_KEY || process.env.API_KEY;

if (typeof fetch === "undefined") {
  throw new Error("global fetch is not available. Use Node.js 18+ or provide a fetch polyfill.");
}

const server = new McpServer({ name: "imagingsearch-mcp", version: "1.0.0" });
console.error("[mcp-server] starting with API_URL=%s", API_URL);

server.registerTool("queryDicomData",
  {
    description:
      "Search for medical imaging studies (DICOM format) that originate in a PACS or VNA system using natural language. Searches across all DICOM metadata tags and semantic embeddings (text reports and images) ingested via dcm2bq. Gemini interprets the query and generates optimized SQL combining deterministic metadata filters with vector-based semantic search. Supports pagination (limit/offset), dry-run to preview SQL, and count-only mode to return just the total number of matching studies.",
    inputSchema: {
      textInput: z
        .string()
        .describe(
          "Natural language query for DICOM studies, e.g. 'female patients 30-50 with emphysema', 'CT scans past 5 years with pneumothorax', or 'CR/DX males with pleural effusion'."
        ),
      limit: z
        .number()
        .optional()
        .describe(
          "Maximum number of results to return (1-1000; default: 50). Applies after deterministic + semantic ranking."
        ),
      offset: z
        .number()
        .optional()
        .describe(
          "Number of results to skip for pagination (default: 0). Use with 'limit' to page through results."
        ),
      dryRun: z
        .boolean()
        .optional()
        .describe(
          "If true, return only the generated SQL and query plan metadata without executing against BigQuery (default: false)."
        ),
      countOnly: z
        .boolean()
        .optional()
        .describe(
          "If true, return only the exact total count of matching studies. Ignores limit/offset."
        ),
    },
  },
  async (args, extra) => {
    console.error("[mcp-server] raw tool params:", JSON.stringify(args));
    const textInput = args?.textInput;
    if (!textInput || typeof textInput !== "string") {
      throw new Error("textInput must be a non-empty string.");
    }

    console.error("[mcp-server] queryDicomData invoked textInput=%s", textInput);

    const headers = { "Content-Type": "application/json" };
    if (API_KEY) {
      headers.Authorization = `Bearer ${API_KEY}`;
    }

    const requestBody = {
      textInput,
      ...(args?.limit !== undefined && { limit: args.limit }),
      ...(args?.offset !== undefined && { offset: args.offset }),
      ...(args?.dryRun && { dryRun: args.dryRun }),
      ...(args?.countOnly && { countOnly: args.countOnly }),
    };

    let response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      console.error("[mcp-server] fetch to API_URL failed:", err);
      throw err;
    }
    if (!response.ok) {
      const bodyText = await response.text();
      console.error("[mcp-server] upstream error %s %s", response.status, bodyText);
      throw new Error(`Upstream /api/query failed with ${response.status}: ${bodyText}`);
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
transport.onclose = () => console.error("[mcp-server] transport closed");
transport.onerror = (err) => console.error("[mcp-server] transport error", err);
server.connect(transport);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection in MCP server:", err);
});
