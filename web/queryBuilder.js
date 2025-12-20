/**
 * Query Builder Module
 * Constructs SQL queries based on NLP-generated components and execution config
 */

/**
 * Build the final SQL query based on Gemini response and execution config
 * @param {Object} geminiResponse - Response from Gemini with whereClause and vectorSearch
 * @param {Object} config - Configuration object with limit, offset, dryRun, countOnly
 * @returns {Object} Object with query and metadata about how to execute it
 */
function buildQuery(geminiResponse, config) {
  const { whereClause = "", vectorSearch = null } = geminiResponse;
  const { limit = 50, offset = 0, countOnly = false } = config;

  // Build the base SELECT statement
  const baseQuery = constructBaseQuery(whereClause, vectorSearch);

  // Handle countOnly mode - wrap in COUNT query
  if (countOnly) {
    return {
      query: wrapInCountQuery(baseQuery),
      mode: "countOnly",
      shouldStripOrderBy: true,
    };
  }

  // Add LIMIT and OFFSET for paginated queries
  const paginatedQuery = `${baseQuery} LIMIT ${limit + 1} OFFSET ${offset}`;

  return {
    query: paginatedQuery,
    mode: "paginated",
    limit,
    offset,
  };
}

/**
 * Construct the base SELECT query without LIMIT/OFFSET
 * @private
 */
function constructBaseQuery(whereClause, vectorSearch) {
  // Normalize whereClause - ensure it's never null/undefined for query building
  const normalizedWhereClause = whereClause && whereClause.trim() ? whereClause.trim() : "";
  
  return `
  -- Statically assigned the SELECT statement, because Gemini based is non-deterministic
  SELECT
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientID')) AS PatientID,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientName')) AS PatientName,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientAge')) AS PatientAge,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientSex')) AS PatientSex,
    JSON_VALUE(meta.metadata, '$.StudyInstanceUID') AS StudyInstanceUID,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.StudyDescription')) AS StudyDescription,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.StudyDate')) AS StudyDate,
    STRING_AGG(DISTINCT JSON_VALUE(meta.metadata, '$.Modality'), "/") AS Modality,
    COUNT(DISTINCT JSON_VALUE(meta.metadata, '$.SeriesInstanceUID')) AS NumberOfSeries,
    COUNT(DISTINCT JSON_VALUE(meta.metadata, '$.SOPInstanceUID')) AS NumberOfInstances
    ${vectorSearch ? `, CASE WHEN MIN(vectorSearch.distance) IS NULL THEN 1.0 ELSE MIN(vectorSearch.distance) END AS VectorSearchDistance` : ""}
FROM
    \`dicom.metadataView\` AS meta
${vectorSearch ? buildVectorSearchJoin(vectorSearch) : ""}
${normalizedWhereClause ? `WHERE ${normalizedWhereClause}` : "WHERE TRUE"}
GROUP BY StudyInstanceUID
${vectorSearch ? `ORDER BY VectorSearchDistance ASC` : ""}`;
}

/**
 * Build the VECTOR_SEARCH JOIN clause
 * @private
 */
function buildVectorSearchJoin(vectorSearch) {
  return `
-- Join the vector search for documents and use for ordering
LEFT JOIN VECTOR_SEARCH(
  TABLE \`dicom.metadataEmbeddings\`, 'ml_generate_embedding_result',
  (
  SELECT ml_generate_embedding_result, content AS query
  FROM ML.GENERATE_EMBEDDING(
  MODEL \`dicom.embedding_model\`,
  (SELECT '${escapeStringForSQL(vectorSearch)}' AS content))
  ),
  top_k => 1000, options => '{"fraction_lists_to_search": 0.01}') AS vectorSearch
ON meta.path = vectorSearch.base.path AND meta.version = vectorSearch.base.version
`;
}

/**
 * Wrap a query in a COUNT subquery
 * @private
 */
function wrapInCountQuery(baseQuery) {
  // Strip ORDER BY clause from the end for count queries
  const strippedQuery = baseQuery.replace(/\s+ORDER\s+BY\s+[\s\S]*$/i, "");
  return `SELECT COUNT(*) AS totalCount FROM ( ${strippedQuery} )`;
}

/**
 * Escape string literals for SQL to prevent injection
 * @private
 */
function escapeStringForSQL(str) {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

/**
 * Parse request body and normalize config values
 * @param {Object} body - Express request body
 * @returns {Object} Normalized config object
 */
function parseConfig(body) {
  const { limit = 50, offset = 0, dryRun = false, countOnly = false } = body;

  return {
    limit: Math.min(Math.max(parseInt(limit) || 50, 1), 1000),
    offset: Math.max(parseInt(offset) || 0, 0),
    dryRun: Boolean(dryRun),
    countOnly: Boolean(countOnly),
  };
}

module.exports = {
  buildQuery,
  parseConfig,
};
