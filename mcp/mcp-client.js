import path from "node:path";
import dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

dotenv.config();

async function main() {
  const textInput = process.argv[2] || "female patients 30-50 with emphysema";

  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(process.cwd(), "mcp-server.js")],
    env: process.env,
  });

  const client = new Client(
    { name: "imagingsearch-mcp-test", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const tools = await client.listTools();
  console.log("Available tools:", tools);

  console.log("Calling queryDicomData with", { textInput });
  try {
    const result = await client.callTool({ name: "queryDicomData", arguments: { textInput }});
    console.log("Tool result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("callTool failed:", err);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
