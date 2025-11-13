import { GraphData } from "../types";
import { ensureAcyclicGraph } from "../utils/graphUtils";

export async function parseDocumentToGraph(documentText: string, apiKey: string): Promise<GraphData> {
  const prompt = `
You are a senior software architect. Convert the following project description into a detailed technical architecture graph with ACTUAL buildable components.

**CRITICAL DECOMPOSITION RULES:**

1. **NEVER use high-level "Feature" nodes as standalone components**
   - WRONG: {"label": "Image Upload Feature", "inputs": [], "outputs": ["images"]}
   - RIGHT: Break it into actual technical components (UI form, API endpoint, storage, database)

2. **Every component MUST have clear inputs and outputs:**
   - **Root components** (e.g., "Login Form UI", "File Upload Widget"): inputs = [], MUST have outputs
   - **Intermediate components** (e.g., "POST /auth API", "Image Resizer Service"): MUST have BOTH inputs AND outputs
   - **Terminal components** (e.g., "Users Table", "S3 Bucket"): MUST have inputs, outputs can be []
   - **ABSOLUTELY NEVER create a node with both inputs=[] AND outputs=[]**

3. **Use concrete, specific data artifacts:**
   - Good: "User Credentials JSON", "JWT Access Token", "Image Binary Data", "S3 URL String"
   - Bad: "data", "info", "result", "depends on"

**Component Naming Standards:**
- **UI Components**: "Login Form (React)", "Photo Gallery Grid", "Search Bar Component"
- **API Endpoints**: "POST /api/auth/login", "GET /api/images/:id", "PUT /api/albums"
- **Services**: "Image Processing Service", "ML Tagging Engine", "Email Notification Worker"
- **Storage**: "S3 Image Bucket", "PostgreSQL Users Table", "Redis Session Cache"
- **Infrastructure**: "EC2 Application Server", "CloudFront CDN", "Lambda Resize Function"

**Required Fields:**
- **type**: Goal | Feature | Task | Constraint | Idea (business classification)
- **moduleType**: ui | backend | storage | ml-model | data-pipeline | schema | infra | integration | logic
- **implementationType**: "API Endpoint" | "Database Query" | "Database Schema" | "Frontend Component" | "Background Job" | "Configuration" | "Infrastructure Setup" | "ML Model Training" | "Data Pipeline" | "Authentication" | "File Storage" | "Message Queue" | "Cache Layer" | "Business Logic" | "UI/UX Design"
- **inputs**: Array of specific data artifacts consumed ([] only for root nodes)
- **outputs**: Array of specific data artifacts produced ([] only for terminal nodes)
- **resourceLinks**: Max 3 learning resources per node:
  * {"title": "descriptive name", "url": "actual URL", "type": "docs"|"tutorial"|"video"|"forum"}
  * Prefer official docs: AWS, React, PostgreSQL, Express, TensorFlow, etc.
- **stack**: Actual tech stack items ["react", "express", "postgres", "s3", "python"]
- **owners**: Responsible teams ["frontend", "backend", "ml", "infra", "devops"]

**Decomposition Examples:**

WRONG - High-level feature nodes without technical detail:
{
  "nodes": [
    {"id": "upload_feature", "label": "Image Upload Feature", "inputs": [], "outputs": ["images"]},
    {"id": "search_feature", "label": "Search Functionality", "inputs": [], "outputs": ["results"]}
  ]
}

CORRECT - Broken down into actual buildable components:
{
  "nodes": [
    {
      "id": "upload_form_ui",
      "label": "Image Upload Form (React)",
      "description": "File input component with preview and validation",
      "type": "Task",
      "moduleType": "ui",
      "implementationType": "Frontend Component",
      "inputs": [],
      "outputs": ["File Blob", "File Metadata"],
      "stack": ["react", "typescript"],
      "owners": ["frontend"],
      "resourceLinks": [
        {"title": "React File Input Guide", "url": "https://react.dev/reference/react-dom/components/input#reading-the-files-on-the-client", "type": "docs"}
      ]
    },
    {
      "id": "upload_api",
      "label": "POST /api/upload",
      "description": "Multipart file upload endpoint with S3 integration",
      "type": "Task",
      "moduleType": "backend",
      "implementationType": "API Endpoint",
      "inputs": ["File Blob", "Auth Token", "File Metadata"],
      "outputs": ["S3 URL", "Image ID", "Upload Status"],
      "stack": ["express", "multer", "aws-sdk"],
      "owners": ["backend"],
      "resourceLinks": [
        {"title": "Express Multer Middleware", "url": "https://expressjs.com/en/resources/middleware/multer.html", "type": "docs"},
        {"title": "AWS S3 Upload Tutorial", "url": "https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html", "type": "tutorial"}
      ]
    },
    {
      "id": "s3_images_bucket",
      "label": "S3 Images Bucket",
      "description": "Cloud storage for uploaded image files",
      "type": "Task",
      "moduleType": "storage",
      "implementationType": "File Storage",
      "inputs": ["File Binary", "S3 Put Request"],
      "outputs": ["S3 URL", "Storage Event"],
      "stack": ["aws-s3"],
      "owners": ["infra"],
      "resourceLinks": [
        {"title": "AWS S3 Documentation", "url": "https://docs.aws.amazon.com/s3/", "type": "docs"}
      ]
    },
    {
      "id": "images_table",
      "label": "Images Table (PostgreSQL)",
      "description": "Stores image metadata, URLs, and user associations",
      "type": "Task",
      "moduleType": "schema",
      "implementationType": "Database Schema",
      "inputs": ["Image ID", "S3 URL", "User ID", "Upload Timestamp"],
      "outputs": [],
      "stack": ["postgresql"],
      "owners": ["backend"],
      "resourceLinks": [
        {"title": "PostgreSQL Table Design", "url": "https://www.postgresql.org/docs/current/ddl-basics.html", "type": "docs"}
      ]
    }
  ],
  "edges": [
    {"id": "e1", "source": "upload_form_ui", "target": "upload_api", "label": "File Blob"},
    {"id": "e2", "source": "upload_api", "target": "s3_images_bucket", "label": "S3 Put Request"},
    {"id": "e3", "source": "s3_images_bucket", "target": "upload_api", "label": "S3 URL"},
    {"id": "e4", "source": "upload_api", "target": "images_table", "label": "Image Metadata"}
  ]
}

**Architecture Layers (follow this order):**
1. **Infrastructure Layer**: EC2, Lambda, CloudFront, VPC, Load Balancers
2. **Storage Layer**: S3 Buckets, RDS, DynamoDB, Redis, ElasticSearch
3. **Schema Layer**: Database tables, indexes, schemas
4. **Backend Layer**: API endpoints, services, workers, queues
5. **Business Logic Layer**: Processing engines, ML models, validators
6. **Frontend Layer**: UI components, pages, state management

**Output JSON Schema:**
{
  "nodes": [
    {
      "id": "unique-kebab-case-id",
      "label": "Specific Component Name",
      "description": "Technical description",
      "type": "Goal|Feature|Task|Constraint|Idea",
      "moduleType": "ui|backend|storage|ml-model|data-pipeline|schema|infra|integration|logic",
      "implementationType": "API Endpoint|Database Schema|Frontend Component|etc",
      "inputs": ["Specific Input 1"],
      "outputs": ["Specific Output 1"],
      "stack": ["tech1", "tech2"],
      "owners": ["team1"],
      "resourceLinks": [
        {"title": "Resource Title", "url": "https://...", "type": "docs|tutorial|video|forum"}
      ]
    }
  ],
  "edges": [
    {
      "id": "edge-unique-id",
      "source": "provider-node-id",
      "target": "consumer-node-id",
      "label": "Specific Data/Artifact Name"
    }
  ]
}

**Example Transformation:**

Input: "Users can upload images and search by tags"

Bad Output:
- Nodes: "Feature_1", "Constraint_1", "Task_1"

Good Output:
- Nodes: 
  * "Image Upload UI" (ui, react, Frontend Component)
    - inputs: ["User Click Event"]
    - outputs: ["Selected Image File", "Upload Form Data"]
    - resources: [{ title: "React File Upload Guide", url: "https://react.dev/reference/react-dom/components/input#reading-the-files-on-the-client", type: "docs" }]
  * "Upload API Gateway" (backend, express, API Endpoint)
    - inputs: ["Multipart Form Data", "Auth Token"]
    - outputs: ["Upload Success Response", "Image S3 URL"]
    - resources: [{ title: "Express Multer Middleware", url: "https://expressjs.com/en/resources/middleware/multer.html", type: "docs" }]
  * "S3 Image Bucket" (storage, aws-s3, File Storage)
    - inputs: ["Image Binary", "Metadata"]
    - outputs: ["Stored Image URL", "Storage Event"]
    - resources: [{ title: "AWS S3 Documentation", url: "https://docs.aws.amazon.com/s3/", type: "docs" }]
  * "Image Metadata DB" (storage, postgres, Database Schema)
    - inputs: ["Image URL", "User ID", "Upload Timestamp"]
    - outputs: ["Metadata Record ID"]
    - resources: [{ title: "PostgreSQL JSON Support", url: "https://www.postgresql.org/docs/current/datatype-json.html", type: "docs" }]
  * "ML Tagging Service" (ml-model, tensorflow, ML Model Training)
    - inputs: ["Image URL"]
    - outputs: ["Tag Predictions Array", "Confidence Scores"]
    - resources: [{ title: "TensorFlow Image Classification", url: "https://www.tensorflow.org/tutorials/images/classification", type: "tutorial" }]
  * "Tag Index" (storage, elasticsearch, Database Query)
    - inputs: ["Tags Array", "Image ID"]
    - outputs: ["Indexed Document ID"]
    - resources: [{ title: "Elasticsearch Quick Start", url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html", type: "docs" }]
  * "Search API" (backend, express, API Endpoint)
    - inputs: ["Search Query", "User Auth Token"]
    - outputs: ["Search Results JSON"]
    - resources: [{ title: "Building Search APIs", url: "https://www.elastic.co/blog/building-a-search-api", type: "tutorial" }]
  * "Search Results UI" (ui, react, Frontend Component)
    - inputs: ["Search Results JSON"]
    - outputs: ["Rendered Gallery View"]
    - resources: [{ title: "React Lists & Keys", url: "https://react.dev/learn/rendering-lists", type: "docs" }]
- Edges:
  * "Image Upload UI" → "Upload API Gateway" (label: "Multipart Form Data")
  * "Upload API Gateway" → "S3 Image Bucket" (label: "Image Binary")
  * "S3 Image Bucket" → "ML Tagging Service" (label: "Image URL")
  * "ML Tagging Service" → "Tag Index" (label: "Tag Predictions Array")
  * "Search Results UI" → "Search API" (label: "Search Query String")
  * "Search API" → "Tag Index" (label: "ElasticSearch Query DSL")
  * "Tag Index" → "Search API" (label: "Matching Document IDs")

**Final Requirements:**
- Minimum 8-15 nodes for a complete architecture
- Every node MUST have either inputs or outputs (or both)
- Include authentication/authorization components for any user-facing features
- Add infrastructure components (servers, CDN, load balancers) when mentioned
- Provide 1-3 relevant resourceLinks per node (official docs preferred)
- Ensure DAG structure (no cycles)

**CRITICAL: NO CYCLES ALLOWED**
This MUST be a Directed Acyclic Graph (DAG). Ensure:
- No circular dependencies (A → B → C → A)
- No bidirectional flows (A → B AND B → A)
- All edges flow in one direction through the architecture
- Think in terms of layers: Lower layers provide services to higher layers, never the reverse

Now convert this document:

${documentText}

Return ONLY valid JSON matching the schema above. No markdown, no explanations.

If you detect a potential cycle, break it by:
- Choosing the dominant flow direction (typically: infrastructure → storage → backend → frontend)
- Using async/event-driven patterns where needed (message queues, event buses)
- Introducing intermediary components (caches, queues) to break circular dependencies

**Project Description to Analyze:**
---
${documentText}
---

Generate a complete system architecture graph with CONCRETE component names and real data flows. 
VERIFY there are no cycles before returning. Return ONLY the JSON object.
`;

  try {
    // Always call the serverless API to keep secrets server-side
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server API error (${response.status}): ${text}`);
    }
    const result = await response.json();
    // Extract text from response
    let jsonText: string;
    const parts = (result as any)?.candidates?.[0]?.content?.parts ?? [];
    jsonText = parts.map((p: any) => p?.text ?? "").join("").trim();
    // Try strict parse first
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      // Fallback: extract the largest JSON object block (handles accidental prose or fenced code)
      const fenceMatch = jsonText.match(/```json([\s\S]*?)```/i) || jsonText.match(/```([\s\S]*?)```/i);
      const candidate = fenceMatch ? fenceMatch[1] : jsonText;
      const braceStart = candidate.indexOf("{");
      const braceEnd = candidate.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
        const sliced = candidate.slice(braceStart, braceEnd + 1);
        parsedJson = JSON.parse(sliced);
      } else {
        console.error("Gemini raw text (truncated):", jsonText.slice(0, 500));
        throw new Error("Model did not return JSON.");
      }
    }

    // Normalize common schema variations
    function normalize(input: any): GraphData | null {
      const root = input?.nodes && input?.edges ? input : input?.graph || input?.data || null;
      const source = root || input;
      if (!source) return null;
      let nodes = source.nodes;
      let edges = source.edges;
      if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;

      // Coerce nodes
      nodes = nodes.map((n: any, idx: number) => {
        if (typeof n === "string") {
          return { id: `node-${idx + 1}`, label: n, description: n, type: "Idea", outputs: [] };
        }
        const id = String(n.id ?? `node-${idx + 1}`);
        const label = String(n.label ?? n.title ?? n.name ?? id);
        const description = String(n.description ?? n.text ?? label);
        const type = String(n.type ?? "Idea");
        const outputs = Array.isArray(n.outputs) ? n.outputs.map(String) : [];
        return { id, label, description, type, outputs };
      });

      // Coerce edges
      edges = edges.map((e: any, idx: number) => {
        const id = String(e.id ?? `edge-${idx + 1}`);
        const source = String(e.source ?? e.from ?? e.src ?? "");
        const target = String(e.target ?? e.to ?? e.dst ?? "");
        const label = String(e.label ?? e.name ?? e.data ?? "");
        return { id, source, target, label };
      }).filter((e: any) => e.source && e.target);

      return { nodes, edges };
    }

    const normalized = normalize(parsedJson as any);
    if (!normalized) {
      console.error("Gemini parsed JSON (truncated):", JSON.stringify(parsedJson).slice(0, 500));
      throw new Error("API response is missing 'nodes' or 'edges' array.");
    }

    // Ensure the graph is acyclic - break any cycles automatically
    const acyclicGraph = ensureAcyclicGraph(normalized as GraphData);
    
    return acyclicGraph;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to parse document. The model may have returned an invalid structure.");
  }
}