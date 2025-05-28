import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Link as MuiLink, // Alias to avoid conflict if you use react-router Link
  AppBar,
  Toolbar,
  TextField, // Added
  Button,    // Added
} from "@mui/material";

const defaultQueries = [
  "Find imaging studies for female patients between 30 and 50 years of age with Emphysema",
  "Modality: ['CR', 'DX'], male patients, past 10 years, with pneumothorax findings",
  "Find all studies that use a compressed transfer syntax",
  "dx modality, female patient, age: <50, findings normal",
  "male patient, study done in past 10 years, findings: asthma",
];

function App() {
  const [inputText, setInputText] = useState("");
  const [queryText, setQueryText] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState("");

  const handleDropdownChange = (event) => {
    const newQuery = event.target.value;
    setSelectedQuery(newQuery);
    setInputText(newQuery); // Update inputText when dropdown changes
    // fetchData will be called by useEffect due to selectedQuery change
  };

  const fetchData = async (queryToFetch) => {
    if (!queryToFetch) return; // Don't fetch if no query is selected
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
        body: JSON.stringify({ textInput: queryToFetch }),
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

  // Fetch data when selectedQuery changes
  useEffect(() => {
    // This useEffect is specifically for dropdown-initiated fetches
    if (selectedQuery && selectedQuery === inputText) { // Ensure it's a dropdown selection that also updated inputText
      fetchData(selectedQuery);
    }
  }, [selectedQuery, inputText]); // Add inputText to dependencies to correctly handle dropdown selections

  const handleInputChange = (event) => {
    setInputText(event.target.value);
    if (selectedQuery && event.target.value !== selectedQuery) {
      setSelectedQuery(""); // Clear dropdown selection if text is manually changed
    }
  };

  const handleSearchClick = () => {
    if (inputText.trim()) {
      fetchData(inputText.trim());
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Hybrid Imaging Search Demo
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth variant="outlined" disabled={loading}>
            <InputLabel id="query-select-label">Select a Query</InputLabel>
            <Select
              labelId="query-select-label"
              id="query-select"
              value={selectedQuery}
              label="Select a Query"
              onChange={handleDropdownChange}
            >
              <MenuItem value="" disabled>
                <em>Select a query...</em>
              </MenuItem>
              {defaultQueries.map((query, index) => (
                <MenuItem key={index} value={query}>
                  {query}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <TextField
            fullWidth
            label="Or type your query here"
            variant="outlined"
            value={inputText}
            onChange={handleInputChange}
            disabled={loading}
            onKeyPress={(ev) => { // Optional: allow Enter key to submit
              if (ev.key === 'Enter') {
                handleSearchClick();
                ev.preventDefault();
              }
            }}
          />
          <Button variant="contained" onClick={handleSearchClick} disabled={loading || !inputText.trim()}>Search</Button>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {queryText && !loading && (
          <Box sx={{ my: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Query Explanation:</Typography>
            <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>{queryText}</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            Error: {error}
          </Alert>
        )}

        {tableData.length > 0 && !loading && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table aria-label="results table">
              <TableHead>
                <TableRow>
                  {Object.keys(tableData[0]).map((key) => (
                    <TableCell key={key} sx={{ fontWeight: 'bold' }}>{key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} hover>
                    {Object.entries(row).map(([key, value], colIndex) => (
                      <TableCell key={`${rowIndex}-${colIndex}`}>
                        {/* Example: Make the last column a clickable link if it's named 'details_link' or similar */}
                        {/* You'll need to adjust the condition based on your actual data structure */}
                        {key === "dicomMetadata" ? (
                           <MuiLink component="button" variant="body2" onClick={() => alert(JSON.stringify(value, null, 2))}>
                             View JSON
                           </MuiLink>
                        ) : (
                          String(value) // Ensure value is a string for display
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tableData.length === 0 && !loading && !error && !selectedQuery && !inputText && (
          <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
            Please select a query from the dropdown to fetch data.
          </Typography>
        )}
      </Container>
    </>
  );
}

export default App;
