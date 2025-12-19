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
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastPageCount, setLastPageCount] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState(null);

  const handleDropdownChange = (event) => {
    const newQuery = event.target.value;
    setSelectedQuery(newQuery);
    setInputText(newQuery); // Update inputText when dropdown changes
    // fetchData will be called by useEffect due to selectedQuery change
  };

  const fetchData = async (queryToFetch, { reset = false } = {}) => {
    if (!queryToFetch) return; // Don't fetch if no query is selected
    setLoading(true);
    setError(null);

    const nextOffset = reset ? 0 : offset;
    if (reset) {
      setTableData([]);
      setQueryText("");
      setHasMore(false);
      setLastPageCount(0);
      setExecutionTimeMs(null);
    }

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ textInput: queryToFetch, limit, offset: nextOffset }),
      });

      if (!response.ok) {
        let errorMessage = "Something went wrong on the server.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          try {
            const text = await response.text();
            errorMessage = text || errorMessage;
          } catch (textError) {
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const rows = data.data || data.rows || [];
      const md = data.metadata || {};

      setQueryText(data.geminiResponse?.notes || "");
      setTableData((prev) => (reset ? rows : [...prev, ...rows]));

      // Update paging metadata
      const returned = typeof md.rowsReturned === 'number' ? md.rowsReturned : rows.length;
      setLastPageCount(returned);
      setHasMore(!!md.hasMore);
      if (typeof md.executionTime === 'number') {
        setExecutionTimeMs(md.executionTime);
      } else if (typeof md.executionTime === 'string') {
        const parsedMs = parseInt(md.executionTime, 10);
        if (!Number.isNaN(parsedMs)) setExecutionTimeMs(parsedMs);
      }
      if (typeof md.limit === 'number') setLimit(md.limit);

      // Advance offset for the next page
      const baseOffset = typeof md.offset === 'number' ? md.offset : nextOffset;
      setOffset(baseOffset + returned);
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
    if (selectedQuery && selectedQuery === inputText) {
      fetchData(selectedQuery, { reset: true });
    }
  }, [selectedQuery, inputText]);

  const handleInputChange = (event) => {
    setInputText(event.target.value);
    if (selectedQuery && event.target.value !== selectedQuery) {
      setSelectedQuery(""); // Clear dropdown selection if text is manually changed
    }
  };

  const handleSearchClick = () => {
    if (inputText.trim()) {
      fetchData(inputText.trim(), { reset: true });
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && inputText.trim()) {
      fetchData(inputText.trim(), { reset: false });
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

        {/* Show full-page loading spinner only during initial fetch (no data yet) */}
        {loading && tableData.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {queryText && (
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

        {tableData.length > 0 && (
          <>
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

            {/* Pagination controls and load more button grouped with table */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  Showing {tableData.length} result{tableData.length === 1 ? '' : 's'}
                  {typeof lastPageCount === 'number' && lastPageCount > 0 ? ` (last page: ${lastPageCount})` : ''}
                  {typeof executionTimeMs === 'number' ? ` • last query ${executionTimeMs} ms` : ''}
                  {hasMore ? ' • more available' : (tableData.length > 0 ? ' • no more results' : '')}
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  label="Rows per page"
                  value={limit}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v > 0 && v <= 1000) {
                      setLimit(v);
                    }
                  }}
                  inputProps={{ min: 1, max: 1000 }}
                  sx={{ width: 150 }}
                  disabled={loading}
                />
              </Box>

              {hasMore && (
                <Button 
                  variant="contained" 
                  onClick={handleLoadMore} 
                  disabled={loading || !hasMore}
                  sx={{ minWidth: 200 }}
                >
                  {loading ? 'Loading more…' : 'Load more results'}
                </Button>
              )}
            </Box>
          </>
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
