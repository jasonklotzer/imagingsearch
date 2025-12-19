# Imagingsearch MCP Server

This is the Model Context Protocol (MCP) server for the imagingsearch DICOM query system.

## Running the server

Ensure the backend Express API is running at `http://localhost:5000/api/query` (or set `IMAGINGSEARCH_API_URL`).

The backend API requires DICOM data to be ingested into BigQuery. This is typically done using the [dcm2bq project](https://github.com/GoogleCloudPlatform/dcm2bq), which creates the metadata tables and embeddings that the API queries.

```bash
npm install
npm start
```

This starts the MCP server listening on stdio. The server can be configured in various MCP clients for seamless integration.

## Testing

The MCP server has been tested with the following clients:

### Gemini CLI

To test with the Gemini CLI:

```bash
IMAGINGSEARCH_API_URL=http://localhost:5000/api/query npm test -- "female patients 30-50 with emphysema"
```

The test client will spawn the server, list available tools, and invoke `queryDicomData` with your query. The Gemini CLI will interpret the results and provide a summary.

### VS Code Integration

To test within VS Code using the MCP extension:

1. Install the MCP for VS Code extension (if available).
2. Configure the MCP server in your VS Code settings or workspace configuration (see examples below).
3. The `queryDicomData` tool will be available in the MCP tool panel.

### Local Test Client

Run the built-in test client:

```bash
IMAGINGSEARCH_API_URL=http://localhost:5000/api/query npm test -- "your query here"
```

## Integration & Configuration Examples

### VS Code Configuration

Add the MCP server to your VS Code `settings.json` or workspace settings:

```json
{
  "modelContextProtocol": {
    "servers": {
      "imagingsearch": {
        "command": "node",
        "args": ["/path/to/imagingsearch/mcp/mcp-server.js"],
        "env": {
          "IMAGINGSEARCH_API_URL": "http://localhost:5000/api/query"
        }
      }
    }
  }
}
```

Or in a `.mcpServers.json` file:

```json
{
  "imagingsearch": {
    "command": "node",
    "args": ["/path/to/imagingsearch/mcp/mcp-server.js"],
    "env": {
      "IMAGINGSEARCH_API_URL": "http://localhost:5000/api/query",
      "IMAGINGSEARCH_API_KEY": "your-optional-bearer-token"
    }
  }
}
```

### Gemini CLI Configuration

Configure the Gemini CLI to use this MCP server by adding it to your Gemini config file (typically `~/.config/gemini/config.json`):

```json
{
  "tools": [
    {
      "name": "imagingsearch",
      "type": "mcp",
      "command": "node",
      "args": ["/path/to/imagingsearch/mcp/mcp-server.js"],
      "env": {
        "IMAGINGSEARCH_API_URL": "http://localhost:5000/api/query"
      }
    }
  ]
}
```

Then use it with the Gemini CLI:

```bash
gemini "Find imaging studies for female patients between 30 and 50 with emphysema" --tools imagingsearch
```

## Tool reference

- **Tool name:** `queryDicomData`
- **Description:** Query DICOM imaging studies using natural language filters (modality, findings, demographics, date ranges).
- **Input:** `{ "textInput": "<natural language query>" }`
- **Output:** JSON containing:
  - `rows`: Array of studies matching the query
  - `geminiResponse`: Object with generated SQL, WHERE clause, search terms, and analysis

### Example Usage

Input:
```json
{
  "textInput": "female patients 30-50 with emphysema"
}
```

Output (sample):
```json
{
  "rows": [
    {
      "PatientID": "16422",
      "PatientAge": "36",
      "PatientSex": "F",
      "StudyInstanceUID": "1.3.6.1.4.1.11129...",
      "StudyDescription": "Effusion|Emphysema|Pneumothorax",
      "Modality": "DX",
      "NumberOfSeries": 1,
      "NumberOfInstances": 1,
      "TextSearchDistance": 0.383
    }
  ],
  "geminiResponse": {
    "query": "SELECT ... WHERE PatientSex='F' AND PatientAge BETWEEN 30 AND 50",
    "whereClause": "PatientSex='F' AND PatientAge BETWEEN 30 AND 50",
    "textSearch": "emphysema",
    "imageSearch": "emphysema",
    "notes": "Filters for female patients age 30-50 with emphysema findings"
  }
}
```

## Environment variables

- `IMAGINGSEARCH_API_URL` – URL to the backend `/api/query` endpoint (default: `http://localhost:5000/api/query`)
- `IMAGINGSEARCH_API_KEY` or `API_KEY` – Optional bearer token to send to the backend API (sent as `Authorization: Bearer <token>`).
