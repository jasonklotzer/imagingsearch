import React, { useState } from "react";
import "./App.css"; // You can add some basic styling here

function App() {
  const [inputText, setInputText] = useState("");
  const [queryText, setQueryText] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setTableData([]); // Clear previous data
    setQueryText(""); // Clear previous query

    try {
      const response = await fetch("/api/query", {
        // Replace with your backend URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ textInput: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Something went wrong on the server.");
      }

      const data = await response.json();
      setQueryText(data.geminiResponse.notes);
      setTableData(data.rows);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Hybrid Imaging Search Demo</h1>

      <div className="input-section">
        <input type="text" value={inputText} onChange={handleInputChange} placeholder="Enter your query (e.g., DX modality, male, last 10 years, pneumothorax)" />
        <button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Get Data"}
        </button>
      </div>

      <div className="query-explain">{queryText}</div>

      {error && <div className="error-message">Error: {error}</div>}

      {tableData.length > 0 && (
        <div className="table-container">
          {/* <h2>Results:</h2> */}
          <table>
            <thead>
              <tr>
                {/* Dynamically render table headers */}
                {Object.keys(tableData[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Dynamically render table rows */}
              {/* make the last column in the row be a link that will show a popup of the javascript content */}
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, colIndex) => (
                    <td key={`${rowIndex}-${colIndex}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tableData.length === 0 && !loading && !error && <p>No data to display. Enter a parameter and click "Get Data".</p>}
    </div>
  );
}

export default App;
