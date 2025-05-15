# Hybrid Imaging Search

This project provides a hybrid search solution for medical imaging data, combining deterministic metadata filtering with vector-based semantic search across DICOM metadata, text reports, and image content.

## Business Value

This application addresses the need for efficient and comprehensive access to medical imaging data.  It allows users to:

* **Quickly locate relevant studies:**  Find specific imaging studies based on a combination of structured metadata (e.g., modality, patient demographics, study date) and unstructured information (e.g., clinical findings, diagnoses).
* **Improve diagnostic accuracy:**  By enabling more precise and nuanced searches, clinicians can access the most relevant information to support their diagnoses.
* **Enhance research capabilities:** Researchers can leverage the hybrid search capabilities to identify specific cohorts of patients or studies based on complex criteria, accelerating medical research.
* **Streamline workflows:**  The intuitive search interface simplifies the process of finding imaging data, saving time and improving efficiency for healthcare professionals.

## Example Queries Beyond Traditional DICOM Search

Traditional DICOM search typically relies on exact matches of specific metadata tags.  This system allows for more flexible and powerful queries, such as:

* "Find imaging studies for female patients between 30 and 50 years of age with Emphysema" (combines demographic filtering with a semantic search for a clinical finding).
* "Modality: ['CR', 'DX'], male patients, past 10 years, with pneumothorax findings" (combines metadata filtering and semantic search for a finding).

## Technical Value

The system offers several key technical advantages:

* **Full DICOM Metadata Access:**  The application provides access to the complete DICOM metadata hierarchy, enabling searches based on any DICOM tag.
* **Hybrid Search Strategy:**  It intelligently combines deterministic filtering on metadata fields with vector-based semantic search.  This allows for both precise matching of known attributes and flexible retrieval based on conceptual similarity.
* **Gemini-Powered Query Interpretation:**  The system uses Google's Gemini models to interpret natural language queries and determine the optimal search strategy.  Gemini decides whether to search metadata fields only, or to combine metadata filtering with text and/or image embedding searches.
* **Scalable Architecture:**  Built on Google Cloud Platform (BigQuery, Vertex AI), the system is designed for scalability and can handle large volumes of imaging data.
* **Modern Frontend:**  The React-based frontend provides a user-friendly interface for interacting with the search engine.

## Getting Started

To run this project, you will need:

* A Google Cloud Platform account with BigQuery and Vertex AI enabled.
* Node.js and npm installed.
* Appropriate environment variables set (see `.env` example).