/**
 * BigQuery Executor Module
 * Handles all BigQuery query execution and result processing
 */

/**
 * Execute a query against BigQuery and return results
 * @param {BigQuery} bigquery - BigQuery client instance
 * @param {string} query - SQL query to execute
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Result object with rows and metadata
 */
async function executeQuery(bigquery, query, options = {}) {
  const { location = "US" } = options;

  const result = await bigquery.query({
    query,
    location,
  });

  return {
    rows: result[0] || [],
    jobReference: result[1]?.metadata?.jobReference || null,
  };
}

/**
 * Execute a count-only query and extract the total count
 * @param {BigQuery} bigquery - BigQuery client instance
 * @param {string} countQuery - COUNT SQL query
 * @returns {Promise<number>} Total count
 */
async function executeCountQuery(bigquery, countQuery) {
  const result = await executeQuery(bigquery, countQuery);
  const rows = result.rows;

  if (!rows || rows.length === 0) {
    return 0;
  }

  const countValue = rows[0].totalCount ?? rows[0].f0_;
  return Number(countValue) || 0;
}

/**
 * Execute a paginated query and process results for pagination
 * @param {BigQuery} bigquery - BigQuery client instance
 * @param {string} query - SQL query with LIMIT/OFFSET
 * @param {Object} config - Config with limit and offset
 * @returns {Promise<Object>} Result object with rows, hasMore flag, and metadata
 */
async function executePaginatedQuery(bigquery, query, config) {
  const { limit, offset } = config;

  const result = await executeQuery(bigquery, query);
  const rows = result.rows;

  // We requested limit + 1 to detect if there are more results
  const hasMore = rows.length > limit;
  const returnedRows = rows.slice(0, limit);

  return {
    rows: returnedRows,
    hasMore,
    rowsReturned: returnedRows.length,
    offset,
    limit,
  };
}

/**
 * Format result metadata for API response
 * @param {Object} result - Query result with rows and metadata
 * @param {string} mode - Query mode: "paginated", "countOnly", or "dryRun"
 * @param {number} executionTime - Query execution time in milliseconds
 * @returns {Object} Formatted metadata object
 */
function formatMetadata(result, mode, executionTime) {
  const base = {
    executionTime: `${executionTime}ms`,
  };

  if (mode === "dryRun") {
    return {
      ...base,
      dryRun: true,
    };
  }

  if (mode === "countOnly") {
    return {
      ...base,
      countOnly: true,
      totalCount: result.totalCount || 0,
    };
  }

  // paginated mode
  return {
    ...base,
    rowsReturned: result.rowsReturned,
    limit: result.limit,
    offset: result.offset,
    hasMore: result.hasMore,
  };
}

module.exports = {
  executeQuery,
  executeCountQuery,
  executePaginatedQuery,
  formatMetadata,
};
