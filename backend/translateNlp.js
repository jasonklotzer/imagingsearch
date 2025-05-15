const { GoogleGenAI } = require("@google/genai");

// Initialize Vertex with your Cloud project and location
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID,
  location: "us-central1",
});

function promptGenerator(natLangInput) {
  // Example:
  // Find imaging studies for female patients between 30 and 50 years of age with Emphysema
  // Find all projection imaging studies for male patients in the past 10 years with pneumothorax findings
  // Find all studies that use a compressed transfer syntax
  // };

  return {
    text: 
    `
    Given a request "${natLangInput}", break it up and return as a JSON object:
    - 'whereClause': Find DICOM metadata stored as a JSON column 'metadata' in a BigQuery table: Only use this for deterministic search and store as a WHERE clause. Make sure to use the JSON_VALUE format and SAFE_CAST when casting values. Be sensitive to handling patient name, date, age, and other DICOM specific value representations.
    - 'textSearch': Diagnostic reports and other text data: Store this as optimized keywords for a text embedding search
    - 'imageSearch': DICOM rendered images: Store this as optimized keyword search for image embedding
    - 'notes': Any notes related to the prompt response
    `
  };
}

async function askGemini(contents) {
  // Set the config below to use temperature: 0
  const response = await ai.models.generateContent({
    // model: "gemini-2.5-flash-preview-04-17",
    model: "gemini-2.0-flash",
    // model: "gemini-2.5-flash",
    config: {
      temperature: 0,
    },
    contents,
  });
  return response.text;
}

function extractResponse(unformattedQuery) {
  const PREFIX = `\`\`\`json\n`;
  const SUFFIX = `\`\`\`\n`;
  let query = unformattedQuery;;
  if (unformattedQuery.startsWith(PREFIX)) {
    query = unformattedQuery.substring(PREFIX.length, unformattedQuery.length - SUFFIX.length);
  }
  return JSON.parse(query);
}

/* 
JOIN VECTOR_SEARCH(
  TABLE `dicom.metadataEmbeddings`, 'ml_generate_embedding_result',
  (
  SELECT ml_generate_embedding_result, content AS query
  FROM ML.GENERATE_EMBEDDING(
  MODEL `dicom.embedding_model`,
  (SELECT 'modality: CT' AS content))
  ),
  top_k => 5, options => '{"fraction_lists_to_search": 0.01}') AS textSearch
  */
function constructQuery(whereClause) {
  return `
  SELECT
    ANY_VALUE(JSON_VALUE(metadata, '$.PatientID')) AS PatientID,
    ANY_VALUE(JSON_VALUE(metadata, '$.PatientName')) AS PatientName,
    ANY_VALUE(JSON_VALUE(metadata, '$.PatientAge')) AS PatientAge,
    ANY_VALUE(JSON_VALUE(metadata, '$.PatientSex')) AS PatientSex,
    JSON_VALUE(metadata, '$.StudyInstanceUID') AS StudyInstanceUID,
    ANY_VALUE(JSON_VALUE(metadata, '$.StudyDescription')) AS StudyDescription,
    ANY_VALUE(JSON_VALUE(metadata, '$.StudyDate')) AS StudyDate,
    STRING_AGG(DISTINCT JSON_VALUE(metadata, '$.Modality'), "/" ORDER BY JSON_VALUE(metadata, '$.Modality')) AS Modality,
    COUNT(DISTINCT JSON_VALUE(metadata, '$.SeriesInstanceUID')) AS NumberOfSeries,
    COUNT(DISTINCT JSON_VALUE(metadata, '$.SOPInstanceUID')) AS NumberOfInstances,
    -- ANY_VALUE(metadata) AS MetadataSample
FROM
    \`dicom.metadataView\` AS meta
WHERE ${whereClause==''?"FALSE":whereClause}
GROUP BY
    StudyInstanceUID
LIMIT 100;`;
}

async function generateQuery(natLangInput) {
  const prompt = promptGenerator(natLangInput);
  const geminiResponse = await askGemini(prompt);
  const json = extractResponse(geminiResponse);
  const query = constructQuery(json.whereClause);
  const response = Object.assign({query}, json);
  console.log(response);
  return response;
}

module.exports = generateQuery;
