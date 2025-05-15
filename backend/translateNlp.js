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
  // Modality: ['CR', 'DX'], male patients, past 10 years, with pneumothorax findings
  // Find all studies that use a compressed transfer syntax
  // dx modality, female patient, age: <50, findings normal
  // male patient, study done in past 10 years, findings: asthma
  
  return {
    text: `
    Given a request "${natLangInput}", break it up and return as a JSON object:
    - 'whereClause': Find DICOM metadata stored as a JSON column 'metadata' in a BigQuery table: Only use this for deterministic search and store as a WHERE clause. Make sure to use the JSON_VALUE format and SAFE_CAST when casting values. Be sensitive to handling patient name, date, age, and other DICOM specific value representations.
    - 'textSearch': Diagnostic reports and other text data: Store this as optimized keywords for a text embedding search
    - 'imageSearch': DICOM rendered images: Store this as optimized keyword search for image embedding
    - 'notes': Any notes related to the prompt response
    `,
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
  let query = unformattedQuery;
  if (unformattedQuery.startsWith(PREFIX)) {
    query = unformattedQuery.substring(PREFIX.length, unformattedQuery.length - SUFFIX.length);
  }
  const normal = JSON.parse(query);
  Object.keys(normal).forEach((key) => {
    if (normal[key] == "") {
      normal[key] = null;
    } else if (Array.isArray(normal[key])) {
      if (normal[key].length == 0) {
        normal[key] = null;
      } else {
        normal[key] = normal[key][0]; // TODO: hmmm
      }
    }
  });
  return normal;
}

function constructQuery(whereClause, textSearch) {
  return `
  SELECT
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientID')) AS PatientID,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientName')) AS PatientName,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientAge')) AS PatientAge,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.PatientSex')) AS PatientSex,
    JSON_VALUE(meta.metadata, '$.StudyInstanceUID') AS StudyInstanceUID,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.StudyDescription')) AS StudyDescription,
    ANY_VALUE(JSON_VALUE(meta.metadata, '$.StudyDate')) AS StudyDate,
    STRING_AGG(DISTINCT JSON_VALUE(meta.metadata, '$.Modality'), "/" ORDER BY JSON_VALUE(meta.metadata, '$.Modality')) AS Modality,
    COUNT(DISTINCT JSON_VALUE(meta.metadata, '$.SeriesInstanceUID')) AS NumberOfSeries,
    COUNT(DISTINCT JSON_VALUE(meta.metadata, '$.SOPInstanceUID')) AS NumberOfInstances,
    ${textSearch ? "MIN(textSearch.distance) AS TextSearchDistance," : ""}
    -- ANY_VALUE(metadata) AS MetadataSample
FROM
    \`dicom.metadataView\` AS meta
${
  textSearch
    ? `
JOIN VECTOR_SEARCH(
  TABLE \`dicom.metadataEmbeddings\`, 'ml_generate_embedding_result',
  (
  SELECT ml_generate_embedding_result, content AS query
  FROM ML.GENERATE_EMBEDDING(
  MODEL \`dicom.embedding_model\`,
  (SELECT '${textSearch}' AS content))
  ),
  top_k => 100, options => '{"fraction_lists_to_search": 0.01}') AS textSearch
ON meta.path = textSearch.base.path AND meta.version = textSearch.base.version
`
    : ""
}
${/WHERE/.test(whereClause) ? "" : "WHERE"} ${whereClause == "" ? "FALSE" : whereClause}
GROUP BY StudyInstanceUID
${textSearch ? `ORDER BY TextSearchDistance ASC` : ""}
LIMIT 100;`;
}

async function generateQuery(natLangInput) {
  const prompt = promptGenerator(natLangInput);
  const geminiResponse = await askGemini(prompt);
  const json = extractResponse(geminiResponse);
  const query = constructQuery(json.whereClause, json.textSearch);
  const response = Object.assign({ query }, json);
  console.log(response);
  return response;
}

module.exports = generateQuery;
