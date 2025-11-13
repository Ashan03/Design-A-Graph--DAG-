# Document Processing Pipeline

## Overview

The Design Structurizer now supports a comprehensive document processing pipeline that can handle multiple file formats and automatically extract structured project information.

## Supported Input Formats

- **PDF** (`.pdf`) - Project documents, PRDs, specifications
- **Text** (`.txt`) - Plain text project descriptions
- **Markdown** (`.md`) - Formatted project documentation
- **Word** (`.docx`) - Microsoft Word documents

## Pipeline Architecture

```
┌─────────────────┐
│   File Upload   │
│  or Text Paste  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Format Detection│
│  & Text Extract │ ← Uses Gemini API for PDF/DOCX
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Structure     │
│   Extraction    │ ← AI-powered categorization
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Categorize:    │
│  • Project      │
│  • Goals        │
│  • Features     │
│  • Constraints  │
│  • Tasks        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Convert to     │
│ Natural Language│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Graph          │
│  Generation     │ ← Existing pipeline
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Interactive    │
│  Graph + List   │
└─────────────────┘
```

## How It Works

### 1. **File Upload & Text Extraction**
   - User uploads a file or pastes text directly
   - PDF/DOCX files are sent to Gemini API with multimodal support
   - Text is extracted from the document

### 2. **Structure Extraction**
   - Extracted text is analyzed by Gemini
   - AI identifies and categorizes content into:
     - **Project**: Main project name/title
     - **Goals**: High-level objectives
     - **Features**: Specific functionalities to build
     - **Constraints**: Limitations and dependencies
     - **Tasks**: Concrete action items

### 3. **Natural Language Conversion**
   - Structured data is reformatted into a clean, readable format
   - Maintains consistency with the original input format
   - Example output:
     ```
     Project: AI-Powered Photo Organizer
     
     Goals:
     - Create automatic photo categorization
     - Provide intuitive search capabilities
     
     Features:
     1. User Authentication
     2. Image Upload
     3. Automatic Tagging
     
     Constraints:
     - Must be web-based
     - Deploy on AWS
     
     Tasks:
     - Design UI/UX
     - Set up backend infrastructure
     ```

### 4. **Graph Generation**
   - Processed text feeds into the existing graph generation pipeline
   - Creates nodes and edges representing dependencies
   - Applies intelligent layout and visualization

## Usage

### In the UI

1. Click **"📄 Upload PDF, TXT, MD, or DOCX"** button
2. Select your project document
3. Wait for processing (typically 2-5 seconds)
4. Review extracted text in the textarea
5. Click **"Generate Graph"** to visualize

### Programmatically

```typescript
import { processDocument } from './services/documentProcessor';

// From a file
const file = // ... File object from input
const naturalLanguageText = await processDocument(file);

// From text
const rawText = "Project description...";
const structuredText = await processDocument(rawText);
```

## API Endpoints

### `/api/gemini` (Enhanced)

**Request:**
```json
{
  "prompt": "Extract text from this document...",
  "fileData": {
    "mimeType": "application/pdf",
    "data": "base64EncodedContent"
  }
}
```

**Response:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "Extracted content..." }]
    }
  }]
}
```

## File Size Limits

- **Maximum file size**: 10MB (Gemini API limit)
- **PDF pages**: Best performance with < 50 pages
- **Processing time**: 2-10 seconds depending on document complexity

## Error Handling

The pipeline includes comprehensive error handling:

- **Unsupported formats**: Clear error message with supported types
- **Processing failures**: Fallback to raw text display
- **Network errors**: Retry logic with user feedback
- **Malformed documents**: Graceful degradation

## Benefits

1. **Format Flexibility**: Accept any common document format
2. **Automatic Structuring**: AI extracts relevant project components
3. **Consistency**: Standardized format regardless of input
4. **Time Saving**: No manual reformatting required
5. **Accuracy**: AI understands context and relationships

## Future Enhancements

- [ ] Support for images (extract text from screenshots)
- [ ] Excel/CSV parsing for tabular project data
- [ ] Google Docs integration
- [ ] Batch processing for multiple documents
- [ ] Custom extraction templates
- [ ] OCR for scanned documents
- [ ] Language translation support

## Technical Stack

- **Frontend**: React + TypeScript
- **File Processing**: Browser FileReader API + Gemini Multimodal
- **AI**: Google Gemini 2.0 Flash
- **Backend**: Vercel Serverless Functions
- **Format Support**: Native browser APIs + AI extraction
