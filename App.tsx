import React, { useState, useCallback } from 'react';
import { GraphData, Node, ViewMode, Tag } from './types';
import { parseDocumentToGraph } from './services/geminiService';
import InputPanel from './components/InputPanel';
import GraphView from './components/GraphView';
import ChecklistView from './components/ChecklistView';
import NodeDetailPanel from './components/NodeDetailPanel';
import { topoSort } from './utils/graphUtils';

const sampleDocument = `Project: AI-Powered Photo Organizer

Goals:
The main goal is to create an application that automatically categorizes user-uploaded photos based on their content. This supports the secondary goal of providing users with a quick and intuitive way to search their photo library.

Features:
1. User Authentication: Users must be able to sign up and log in. This is a primary feature.
2. Image Upload: Users can upload multiple images at once.
3. Automatic Tagging: The core feature. The system uses a computer vision model to identify objects, scenes, and faces in photos and applies relevant tags. This depends on a trained ML model.
4. Search Functionality: Users can search for photos using tags, dates, or keywords. This requires the Automatic Tagging feature to be functional.
5. Album Creation: Users can create albums and manually add photos.

Constraints:
- Must be a web-based application.
- The computer vision model needs to be either developed in-house or licensed from a third-party provider. This is a major dependency.
- Initial deployment must be on AWS.

Tasks:
- Design UI/UX for all features.
- Set up backend infrastructure on AWS. This blocks deployment.
- Develop the image upload module.
- Integrate the computer vision model. This tests the ML model dependency.
`;
// console.log("VITE_API_KEY =", import.meta.env.VITE_API_KEY);
export default function App() {
  const [documentText, setDocumentText] = useState<string>(sampleDocument);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeTags, setNodeTags] = useState<Record<string, Tag>>({});
  const [focusContextOnly, setFocusContextOnly] = useState<boolean>(false);

  const handleGenerateGraph = useCallback(async () => {
    if (!documentText.trim()) {
      setError('Project description cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGraphData(null);
    setSelectedNode(null);
    setNodeTags({});

    try {
      const data = await parseDocumentToGraph(documentText);
      if (data.nodes && data.edges) {
        setGraphData(data);
      } else {
        throw new Error('Invalid data structure received from API.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [documentText]);

  const updateNode = useCallback((updatedNode: Node) => {
    setGraphData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        nodes: prevData.nodes.map(n => (n.id === updatedNode.id ? updatedNode : n)),
      };
    });
    setSelectedNode(updatedNode);
  }, []);
  
  const updateNodeTag = useCallback((nodeId: string, tag: Tag) => {
      setNodeTags(prevTags => ({
          ...prevTags,
          [nodeId]: tag
      }));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setGraphData(prevData => {
        if (!prevData) return null;

        const newNodes = prevData.nodes.filter(n => n.id !== nodeId);
        const newEdges = prevData.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

        return {
            nodes: newNodes,
            edges: newEdges
        };
    });
    if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
    }
  }, [selectedNode]);

  const sortedNodeIds = React.useMemo(() => {
    if (!graphData) return [];
    try {
      return topoSort(graphData);
    } catch (e) {
      setError("Graph contains a cycle and cannot be displayed as a checklist.");
      return [];
    }
  }, [graphData]);
  
  const sortedNodes = React.useMemo(() => {
    if (!graphData) return [];
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
    return sortedNodeIds.map(id => nodeMap.get(id)).filter((n): n is Node => !!n);
  }, [sortedNodeIds, graphData]);

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-background text-foreground">
      <div className="w-full md:w-1/3 xl:w-1/4 p-4 border-r border-border flex flex-col space-y-4 overflow-y-auto">
        <InputPanel
          documentText={documentText}
          setDocumentText={setDocumentText}
          onGenerate={handleGenerateGraph}
          isLoading={isLoading}
          error={error}
          graphData={graphData}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
        <div className="flex items-center gap-2 text-xs text-foreground">
          <input
            id="focus-context"
            type="checkbox"
            className="accent-primary h-3 w-3"
            checked={focusContextOnly}
            onChange={e => setFocusContextOnly(e.target.checked)}
            disabled={!selectedNode}
          />
          <label htmlFor="focus-context" className={!selectedNode ? "opacity-50" : "cursor-pointer"}>
            Show only connections of selected node
          </label>
        </div>
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            onUpdateNode={updateNode}
            onClose={() => setSelectedNode(null)}
            tag={nodeTags[selectedNode.id] || 'none'}
            onUpdateTag={updateNodeTag}
          />
        )}
      </div>
      <main className="flex-1 p-4 bg-card flex items-center justify-center relative">
        {isLoading && (
          <div className="flex flex-col items-center space-y-2">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-muted-foreground">Analyzing document...</span>
          </div>
        )}
        {!isLoading && !graphData && !error && (
            <div className="text-center text-muted-foreground">
                <h2 className="text-2xl font-bold mb-2 text-foreground">Welcome to Design Structurizer</h2>
                <p>Paste your project description on the left and click "Generate Graph" to visualize its structure.</p>
            </div>
        )}
        {!isLoading && error && !graphData && (
             <div className="text-center text-destructive">
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p>{error}</p>
            </div>
        )}
        {!isLoading && graphData && viewMode === 'graph' && (
          <GraphView
            data={graphData}
            selectedNodeId={selectedNode?.id || null}
            onNodeClick={setSelectedNode}
            onDeleteNode={handleDeleteNode}
            nodeTags={nodeTags}
            showOnlySelectedContext={focusContextOnly}
          />
        )}
        {!isLoading && graphData && viewMode === 'checklist' && (
           <ChecklistView nodes={sortedNodes} edges={graphData.edges} />
        )}
      </main>
    </div>
  );
}