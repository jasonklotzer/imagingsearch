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
      "Query DICOM imaging studies using natural language filters (modality, findings, demographics, date ranges). Forwards to the imagingsearch backend API.",
    inputSchema: {
        textInput: z.string().describe("Natural language description of the DICOM data to query."),
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

    let response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ textInput })
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
