/**
 * Document Processing Pipeline
 * Handles various file formats and extracts structured project information
 */

export interface ProcessedDocument {
  rawText: string;
  structuredData?: {
    project?: string;
    goals?: string[];
    features?: string[];
    constraints?: string[];
    tasks?: string[];
  };
  format: 'text' | 'pdf' | 'structured';
}

/**
 * Extract text from PDF using browser's built-in capabilities
 * For server-side processing, we'll use Gemini to extract and structure the content
 */
async function extractTextFromPDF(file: File): Promise<string> {
  // Convert PDF to base64 for sending to Gemini
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from various file formats
 */
export async function extractTextFromFile(file: File, apiKey: string): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Handle PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const base64Data = await extractTextFromPDF(file);
    
    // Use Gemini to extract text from PDF
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Extract all text content from this PDF document. Return only the extracted text without any additional commentary or formatting.',
        fileData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      })
    });

    if (!response.ok) {
      throw new Error(`PDF processing failed: ${response.statusText}`);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  }

  // Handle text files
  if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return await file.text();
  }

  // Handle Word documents (docx) - convert to text
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    // For Word docs, we'll need to send to Gemini as well
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Extract all text content from this Word document. Return only the extracted text without any additional commentary or formatting.',
        apiKey,
        fileData: {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          data: base64
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Word document processing failed: ${response.statusText}`);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  }

  throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Supported formats: PDF, TXT, MD, DOCX`);
}

/**
 * Structure raw text into project components using Gemini
 */
export async function structureDocument(rawText: string): Promise<ProcessedDocument> {
  const prompt = `
You are a technical requirements analyst. Extract and structure this document into actionable technical components.

**Your Task:** Analyze the document and decompose it into concrete system components, NOT abstract concepts.

Extract and categorize:

1. **Project Name/Title**: The system or application being built

2. **Goals**: Business objectives (what success looks like)
   - Focus on measurable outcomes
   - Keep high-level and non-technical

3. **Features**: User-facing capabilities
   - Describe WHAT users can do, not HOW it works
   - Example: "Users can search photos by date and tags"

4. **Constraints**: Technical requirements and limitations
   - Infrastructure requirements (AWS, cloud-native, etc.)
   - Performance requirements (latency, scale)
   - Compliance/security requirements
   - Budget or timeline constraints
   - Third-party dependencies

5. **Tasks**: Specific implementation work items
   - Break features into buildable components
   - Use concrete technical language
   - Examples:
     * "Implement OAuth2 authentication flow"
     * "Design PostgreSQL schema for user profiles"
     * "Build React image gallery component"
     * "Configure S3 bucket with CDN"
     * "Train ML model for image classification"

**IMPORTANT**: For Tasks, think like an architect breaking down features into actual system components:
- Authentication → ["Build Login UI", "Setup JWT Service", "Create User DB Schema"]
- Image Upload → ["Build Upload Form", "Setup S3 Bucket", "Create Upload API Endpoint"]
- Search → ["Build Search UI", "Setup ElasticSearch", "Create Search API", "Build Query Parser"]

Return a JSON object:
{
  "project": "System Name",
  "goals": ["Business goal 1", "Business goal 2"],
  "features": ["User-facing capability 1", "User-facing capability 2"],
  "constraints": ["Technical constraint 1", "Technical constraint 2"],
  "tasks": ["Concrete implementation task 1", "Concrete implementation task 2"]
}

Guidelines:
- Use specific technical terms (APIs, databases, services, components)
- Avoid generic labels like "Module 1" or "Feature A"
- Think in terms of actual architecture: UI → API → Service → Database
- Each task should be something a developer can estimate and build

Document to analyze:
---
${rawText}
---

Return ONLY the JSON object.
`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`Document structuring failed: ${response.statusText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Parse JSON from response
  let structuredData;
  try {
    // Try to extract JSON if wrapped in code fences
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    structuredData = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse structured data:', e);
    structuredData = undefined;
  }

  return {
    rawText,
    structuredData,
    format: 'structured'
  };
}

/**
 * Convert structured data back to natural language format
 * This creates input compatible with the existing graph generation pipeline
 */
export function structuredToNaturalLanguage(structured: ProcessedDocument['structuredData']): string {
  if (!structured) return '';

  const parts: string[] = [];

  if (structured.project) {
    parts.push(`Project: ${structured.project}\n`);
  }

  if (structured.goals && structured.goals.length > 0) {
    parts.push('Goals:');
    structured.goals.forEach(goal => parts.push(`- ${goal}`));
    parts.push('');
  }

  if (structured.features && structured.features.length > 0) {
    parts.push('Features:');
    structured.features.forEach((feature, idx) => parts.push(`${idx + 1}. ${feature}`));
    parts.push('');
  }

  if (structured.constraints && structured.constraints.length > 0) {
    parts.push('Constraints:');
    structured.constraints.forEach(constraint => parts.push(`- ${constraint}`));
    parts.push('');
  }

  if (structured.tasks && structured.tasks.length > 0) {
    parts.push('Tasks:');
    structured.tasks.forEach(task => parts.push(`- ${task}`));
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Full pipeline: File → Text → Structured → Natural Language
 */
export async function processDocument(input: File | string, apiKey: string): Promise<string> {
  let rawText: string;
  
  // Step 1: Extract text from file or use string directly
  if (typeof input === 'string') {
    rawText = input;
  } else {
    rawText = await extractTextFromFile(input, apiKey);
  }

  // Step 2: Structure the document
  const processed = await structureDocument(rawText);

  // Step 3: Convert to natural language format
  if (processed.structuredData) {
    return structuredToNaturalLanguage(processed.structuredData);
  }

  // Fallback: return raw text if structuring failed
  return rawText;
}
