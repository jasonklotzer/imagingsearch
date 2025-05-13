SELECT -- Patient Level Attributes
  JSON_VALUE (metadata, '$.PatientID') AS PatientID,
  JSON_VALUE (metadata, '$.PatientName') AS PatientName,
  SAFE_CAST (JSON_VALUE (metadata, '$.PatientAge') AS INT64) AS PatientAge,
  JSON_VALUE (metadata, '$.PatientSex') AS PatientSex,
  SAFE_CAST (
    JSON_VALUE (metadata, '$.PatientWeight') AS BIGNUMERIC
  ) AS PatientWeight,
  -- Study Level Attributes
  JSON_VALUE (metadata, '$.StudyInstanceUID') AS StudyInstanceUID,
  JSON_VALUE (metadata, '$.StudyDate') AS StudyDate,
  JSON_VALUE (metadata, '$.StudyTime') AS StudyTime,
  JSON_VALUE (metadata, '$.StudyDescription') AS StudyDescription,
  -- Series Level Attributes
  JSON_VALUE (metadata, '$.SeriesInstanceUID') AS SeriesInstanceUID,
  JSON_VALUE (metadata, '$.SeriesDate') AS SeriesDate,
  JSON_VALUE (metadata, '$.SeriesTime') AS SeriesTime,
  JSON_VALUE (metadata, '$.SeriesDescription') AS SeriesDescription,
  JSON_VALUE (metadata, '$.Modality') AS Modality,
  -- Image Level Attributes
  JSON_VALUE (metadata, '$.SOPInstanceUID') AS SOPInstanceUID,
  SAFE_CAST (
    JSON_VALUE (metadata, '$.InstanceNumber') AS INT64
  ) AS InstanceNumber
FROM
  `dicom.metadataView`
WHERE
  JSON_VALUE (metadata, '$.StudyDescription') LIKE '%CT CHEST W/O CONTRAST%'
  AND JSON_VALUE (metadata, '$.PatientSex') = 'F'
  AND JSON_VALUE (metadata, '$.Modality') = 'CT'
GROUP BY
  PatientID,
  PatientName,
  PatientAge,
  PatientSex,
  PatientWeight,
  StudyInstanceUID,
  StudyDate,
  StudyTime,
  StudyDescription,
  SeriesInstanceUID,
  SeriesDate,
  SeriesTime,
  SeriesDescription,
  Modality,
  SOPInstanceUID,
  InstanceNumber
LIMIT
  100
  