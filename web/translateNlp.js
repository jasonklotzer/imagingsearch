/**
 * Translate Natural Language to DICOM Query
 * Orchestrates NLP translation using Gemini and returns query components
 */

const { callGemini } = require("./geminiClient");
const { generatePrompt } = require("./promptGenerator");
const { parseGeminiResponse } = require("./responseParser");

/**
 * Convert natural language input to structured query components
 * @param {string} natLangInput - Natural language query from user
 * @returns {Promise<Object>} Object with whereClause, textSearch, imageSearch, and notes
 */
async function translateNlp(natLangInput) {
  try {
    // Generate structured prompt
    const prompt = generatePrompt(natLangInput);

    // Call Gemini API
    const geminiResponse = await callGemini(prompt, {
      model: "gemini-2.0-flash",
      temperature: 0,
    });

    // Parse response into structured format
    const parsed = parseGeminiResponse(geminiResponse);

    // Log for debugging
    if (parsed.query) {
      console.log(parsed.query);
    }

    return parsed;
  } catch (error) {
    console.error("Error in translateNlp:", error);
    throw error;
  }
}

module.exports = translateNlp;
