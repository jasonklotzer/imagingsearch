/**
 * Response Parser Module
 * Parses and normalizes Gemini API responses
 */

/**
 * Extract and parse JSON response from Gemini
 * Handles markdown-wrapped JSON and empty/array values
 * @param {string} unformattedQuery - Raw text response from Gemini
 * @returns {Object} Parsed and normalized response object
 */
function parseGeminiResponse(unformattedQuery) {
  let query = unwrapMarkdown(unformattedQuery);
  const parsed = JSON.parse(query);

  // Normalize response fields
  return normalizeFields(parsed);
}

/**
 * Remove markdown code fence wrapper if present
 * @private
 */
function unwrapMarkdown(text) {
  const PREFIX = `\`\`\`json\n`;
  const SUFFIX = `\`\`\`\n`;

  if (text.startsWith(PREFIX)) {
    return text.substring(PREFIX.length, text.length - SUFFIX.length);
  }
  return text;
}

/**
 * Normalize field values - convert empty strings/arrays to null
 * @private
 */
function normalizeFields(obj) {
  const normalized = { ...obj };

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];

    // Convert empty strings to null
    if (value === "") {
      normalized[key] = null;
      return;
    }

    // Convert empty arrays to null
    if (Array.isArray(value)) {
      if (value.length === 0) {
        normalized[key] = null;
      } else {
        // For non-empty arrays, take first element
        // TODO: Improve this to handle multiple values better
        normalized[key] = value[0];
      }
      return;
    }
  });

  return normalized;
}

module.exports = {
  parseGeminiResponse,
};
