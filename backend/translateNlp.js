const { GoogleGenAI } = require("@google/genai");

// TODO: Subsample multiple object types
const schemaExample = `{"00130010":{"BulkDataURI":"?offset=1606&length=4"},"00131010":{"BulkDataURI":"?offset=1618&length=12"},"00131013":{"BulkDataURI":"?offset=1638&length=8"},"00290010":{"BulkDataURI":"?offset=2538&length=22"},"00291031":{"BulkDataURI":"?offset=2568&length=14"},"00291032":{"BulkDataURI":"?offset=2590&length=4"},"00291033":{"BulkDataURI":"?offset=2602&length=4"},"00291034":{"BulkDataURI":"?offset=2614&length=12"},"07a10010":{"BulkDataURI":"?offset=3660&length=8"},"07a30010":{"BulkDataURI":"?offset=3676&length=8"},"AccessionNumber":"2076699673350889","AcquisitionDate":"19880913","AcquisitionNumber":"2003","AcquisitionTime":"103339.953000","ActualFrameDuration":"180000","Allergies":"Removed for HIPAA compliance","AttenuationCorrectionMethod":"CT-derived mu-map,^CT 4 AC: AC_CT","AxialAcceptance":"27","AxialMash":"5\\\\6","BitsAllocated":16,"BitsStored":16,"BodyPartExamined":"HEADNECK","CollimatorType":"NONE","Columns":168,"ContentDate":"19880913","ContentTime":"105600.000000","ConvolutionKernel":"XYZG=7.00","CorrectedImage":"RAN\\\\DTIM\\\\NORM\\\\ATTN\\\\SCAT\\\\DECY","CountsSource":"EMISSION","DecayCorrection":"START","DecayFactor":"1.0493955440458","DeidentificationMethod":"Per DICOM PS 3.15 AnnexE. Details in 0012,0064","DeidentificationMethodCodeSequence":[{"CodeMeaning":"Basic Application Confidentiality Profile","CodeValue":"113100","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null},{"CodeMeaning":"Clean Pixel Data Option","CodeValue":"113101","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null},{"CodeMeaning":"Clean Descriptors Option","CodeValue":"113105","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null},{"CodeMeaning":"Retain Longitudinal With Modified Dates Option","CodeValue":"113107","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null},{"CodeMeaning":"Retain Patient Characteristics Option","CodeValue":"113108","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null},{"CodeMeaning":"Retain Device Identity Option","CodeValue":"113109","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null},{"CodeMeaning":"Retain Safe Private Option","CodeValue":"113111","CodingSchemeDesignator":"DCM","ItemDelimitationItem":null}],"DeviceSerialNumber":"10000","DoseCalibrationFactor":"31811984","EnergyWindowRangeSequence":[{"EnergyWindowLowerLimit":"425","EnergyWindowUpperLimit":"650","ItemDelimitationItem":null}],"FileMetaInformationVersion":{"BulkDataURI":"?offset=156&length=2"},"FrameOfReferenceUID":"1.3.6.1.4.1.14519.5.2.1.2744.7002.829080052092002506025678249875","FrameReferenceTime":"458123.92324928","HighBit":15,"ImageComments":"Removed for HIPAA compliance","ImageIndex":156,"ImageOrientationPatient":"1\\\\0\\\\0\\\\0\\\\1\\\\0","ImagePositionPatient":"-285.36751038035\\\\-494.58683139285\\\\-1085.657","ImageType":"ORIGINAL\\\\PRIMARY","ImplementationClassUID":"1.2.40.0.13.1.1.1","ImplementationVersionName":"dcm4che-1.4.34","InstanceNumber":"156","LargestImagePixelValue":null,"LongitudinalTemporalInformationModified":"MODIFIED","Manufacturer":"SIEMENS","ManufacturerModelName":"1093","MediaStorageSOPClassUID":"1.2.840.10008.5.1.4.1.1.128","MediaStorageSOPInstanceUID":"1.3.6.1.4.1.14519.5.2.1.2744.7002.727602354746417271538277122640","ModalitiesInStudy":"PT\\\\CT","Modality":"PT","NumberOfSlices":545,"NumberOfStudyRelatedInstances":"1097","PatientAge":"057Y","PatientGantryRelationshipCodeSequence":[{"CodeMeaning":"headfirst","CodeValue":"F-10470","CodingSchemeDesignator":"SNM3","ContextGroupVersion":"20020904000000.000000","ContextIdentifier":"21","ItemDelimitationItem":null,"MappingResource":"DCMR"}],"PatientID":"QIN-HEADNECK-01-0139","PatientIdentityRemoved":"YES","PatientName":"QIN-HEADNECK-01-0139","PatientOrientationCodeSequence":[{"CodeMeaning":"recumbent","CodeValue":"F-10450","CodingSchemeDesignator":"SNM3","ContextGroupVersion":"20020904000000.000000","ContextIdentifier":"19","ItemDelimitationItem":null,"MappingResource":"DCMR","PatientOrientationModifierCodeSequence":[{"CodeMeaning":"supine","CodeValue":"F-10340","CodingSchemeDesignator":"SNM3","ContextGroupVersion":"20020904000000.000000","ContextIdentifier":"20","ItemDelimitationItem":null,"MappingResource":"DCMR"}]}],"PatientPosition":"HFS","PatientSex":"M","PatientWeight":"123.6","PhotometricInterpretation":"MONOCHROME2","PixelData":null,"PixelRepresentation":1,"PixelSpacing":"3.3940266832237\\\\3.3940266832237","PregnancyStatus":4,"ProtocolName":"1PETCT_Neck_Contrast_2mm","RadiopharmaceuticalInformationSequence":[{"ItemDelimitationItem":null,"RadionuclideCodeSequence":[{"CodeMeaning":"F^18^[^18^Fluorine]","CodeValue":"C-111A1","CodingSchemeDesignator":"SNM3","ContextGroupVersion":"20020904000000.000000","ContextIdentifier":"4020","ItemDelimitationItem":null,"MappingResource":"DCMR"}],"RadionuclideHalfLife":"6586.2","RadionuclidePositronFraction":"0.97","RadionuclideTotalDose":"587929992.67578","RadiopharmaceuticalStartTime":"084500.000000"}],"RandomsCorrectionMethod":"DLYD","ReconstructionMethod":"OSEM2D 4i8s","ReferringPhysicianName":"","RequestedProcedureDescription":"PET/CT,TUMOR SKULL TO THIGH","RescaleIntercept":"0","RescaleSlope":"6.8276948928833","RescaleType":"BQML","Rows":168,"SOPClassUID":"1.2.840.10008.5.1.4.1.1.128","SOPInstanceUID":"1.3.6.1.4.1.14519.5.2.1.2744.7002.727602354746417271538277122640","SamplesPerPixel":1,"ScatterCorrectionMethod":"Model-based","SeriesDate":"19880913","SeriesDescription":"PET HeadNeck_0","SeriesInstanceUID":"1.3.6.1.4.1.14519.5.2.1.2744.7002.886851941687931416391879144903","SeriesTime":"102731.687000","SeriesType":"WHOLE BODY\\\\IMAGE","SliceLocation":"-1085.657","SliceThickness":"2.0250000059605","SmallestImagePixelValue":null,"SoftwareVersions":"PET/CT 2007B","SpecialNeeds":"Removed for HIPAA compliance","SpecificCharacterSet":"ISO_IR 100","StudyDate":"19880913","StudyDescription":"CT CHEST W/O CONTRAST","StudyInstanceUID":"1.3.6.1.4.1.14519.5.2.1.2744.7002.373729467545468642229382466905","StudyTime":"101844.421000","TimeOfLastCalibration":"132730.593000\\\\143907.000000","TransferSyntaxUID":"1.2.840.10008.1.2","Units":"BQML","WindowCenter":"23552","WindowWidth":"42393"}`;

// Initialize Vertex with your Cloud project and location
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT_ID,
  location: "us-central1",
});

// TODO: Need a better way to handle CAST failures for when values are invalid or don't exist
function promptGenerator(natLangInput) {
  // Example:
  // Find imaging studies for female patients between 30 and 50 years of age with Emphysema
  // find studies of various x-ray types that use a compressed transfer syntax and map the transfer syntax output to a common name, sorting by patientname
  return {
    text: `
    Given a BigQuery table \`dicom.metadataView\` with the following DICOM information under a JSON column named 'metadata':

    ${schemaExample}

    Write a SQL query to "${natLangInput}".
    Always escape reserved column names like "Rows"
    GROUP the results by JSON_VALUE(\`metadata\`, '$.StudyInstanceUID')
    SELECT any relevant patient, study and series level attributes, with patient attributes showing first, and make sure to include them in the group by criterion
    When casting values, make sure to handle invalid casts
    Limit the amount of results returned to 100
    If the where clause is empty, then return an empty set of results
    Only respond with the SQL query text.`,
  };
}

async function createQuery(contents) {
  // Set the config below to use temperature: 0
  const response = await ai.models.generateContent({
    // model: "gemini-2.5-flash-preview-04-17",
    model: "gemini-2.0-flash",
    config: {
      temperature: 0,
    },
    contents,
  });
  return response.text;
}

function extractQuery(unformattedQuery) {
  const PREFIX = `\`\`\`sql\n`;
  const SUFFIX = `\`\`\`\n`;
  return unformattedQuery.substring(PREFIX.length, unformattedQuery.length - SUFFIX.length);
}

async function generateQuery(natLangInput) {
  const prompt = promptGenerator(natLangInput);
  const unformattedQuery = await createQuery(prompt);
  const query = extractQuery(unformattedQuery);
  return query;
}

module.exports = generateQuery;
