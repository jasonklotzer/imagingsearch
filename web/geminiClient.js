/**
 * Gemini Client Module
 * Handles communication with Google Gemini API
 */

const { GoogleGenAI } = require("@google/genai");

/**
 * Initialize and return Gemini client
 * @returns {GoogleGenAI} Gemini client instance
 */
function initializeGemini() {
  if (!process.env.GCP_PROJECT_ID) {
    throw new Error("GCP_PROJECT_ID environment variable is required");
  }

  return new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: "us-central1",
  });
}

/**
 * Call Gemini API with given prompt
 * @param {Object} prompt - Prompt object with 'text' property
 * @param {Object} options - Optional configuration
 * @returns {Promise<string>} Gemini response text
 */
async function callGemini(prompt, options = {}) {
  const ai = initializeGemini();

  const response = await ai.models.generateContent({
    model: options.model || "gemini-2.0-flash",
    config: {
      temperature: options.temperature ?? 0,
      ...options.config,
    },
    contents: prompt,
  });

  return response.text;
}

module.exports = {
  callGemini,
  initializeGemini,
};
