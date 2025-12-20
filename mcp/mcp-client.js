import path from "node:path";
import dotenv from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const textInput = args.find((a) => !a.startsWith("-")) || "female patients 30-50 with emphysema";

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

  // First call: get count only
  console.log("\n=== STEP 1: Getting count ===");
  console.log("Calling queryDicomData with", { textInput, countOnly: true });
  let totalCount = 0;
  try {
    const countResult = await client.callTool({ 
      name: "queryDicomData", 
      arguments: { textInput, countOnly: true }
    });
    console.log("Count result:");
    console.log(JSON.stringify(countResult, null, 2));
    
    // Extract total count from metadata
    if (countResult && countResult.content) {
      const content = countResult.content[0];
      if (content && content.text) {
        const parsed = JSON.parse(content.text);
        totalCount = parsed.metadata?.totalCount || 0;
        console.log(`\nTotal matching records found: ${totalCount}`);
      }
    }
  } catch (err) {
    console.error("callTool failed:", err);
  }

  // Second call: get actual data (only if count is positive)
  if (totalCount > 0) {
    console.log("\n=== STEP 2: Getting data ===");
    
    // Set a reasonable limit based on total count
    const limit = Math.min(totalCount, 50); // Limit to 50 records maximum
    console.log(`Calling queryDicomData with`, { textInput, countOnly: false, limit });
    
    try {
      const dataResult = await client.callTool({ 
        name: "queryDicomData", 
        arguments: { textInput, countOnly: false, limit }
      });
      console.log("Data result:");
      console.log(JSON.stringify(dataResult, null, 2));
    } catch (err) {
      console.error("callTool failed:", err);
    }
  } else {
    console.log("\n=== STEP 2: Skipped ===");
    console.log("No matching records found. Skipping data retrieval.");
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
