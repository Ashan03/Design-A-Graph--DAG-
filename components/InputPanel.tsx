import React from 'react';
import { GraphData, ViewMode } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';

interface InputPanelProps {
  documentText: string;
  setDocumentText: (text: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
  graphData: GraphData | null;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  documentText,
  setDocumentText,
  onGenerate,
  isLoading,
  error,
  graphData,
  viewMode,
  setViewMode,
}) => {
    
  const handleExport = (format: 'json' | 'csv-nodes' | 'csv-edges' | 'markdown') => {
    if (!graphData) return;
    let content = '';
    let filename = 'graph';
    let mimeType = 'text/plain';

    switch (format) {
      case 'json':
        content = JSON.stringify(graphData, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
      case 'markdown':
        content = `# Project Graph\n\n## Nodes\n\n${graphData.nodes.map(n => `- **${n.label}** (${n.type}): ${n.description}`).join('\n')}\n\n## Edges\n\n${graphData.edges.map(e => `- ${e.source} **${e.label}** ${e.target}`).join('\n')}`;
        filename += '.md';
        break;
      case 'csv-nodes':
        const nodeHeader = 'id,label,type,description\n';
        const nodeRows = graphData.nodes.map(n => `"${n.id}","${n.label}","${n.type}","${n.description.replace(/"/g, '""')}"`).join('\n');
        content = nodeHeader + nodeRows;
        filename += '-nodes.csv';
        mimeType = 'text/csv';
        break;
      case 'csv-edges':
        const edgeHeader = 'id,source,target,label\n';
        const edgeRows = graphData.edges.map(e => `"${e.id}","${e.source}","${e.target}","${e.label}"`).join('\n');
        content = edgeHeader + edgeRows;
        filename += '-edges.csv';
        mimeType = 'text/csv';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="flex flex-col space-y-4 h-full">
      <h1 className="text-2xl font-bold text-foreground">Design Structurizer</h1>
      <div className="flex-grow flex flex-col">
        <label htmlFor="document" className="text-sm font-medium text-muted-foreground mb-1">
          Project Description
        </label>
        <textarea
          id="document"
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder="Paste your PRD, concept note, or project description here..."
          className="flex-grow w-full p-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:outline-none resize-none"
        />
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="w-full bg-transparent border border-border text-foreground font-bold py-2 px-4 rounded-md hover:bg-accent disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          'Generate Graph'
        )}
      </button>

      {graphData && (
        <>
          <div className="bg-card p-1 rounded-md flex space-x-1 border border-border">
            <button
              onClick={() => setViewMode('graph')}
              className={`w-full py-1 rounded ${viewMode === 'graph' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-accent'}`}
            >
              Graph
            </button>
            <button
              onClick={() => setViewMode('checklist')}
              className={`w-full py-1 rounded ${viewMode === 'checklist' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-accent'}`}
            >
              Checklist
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Export</h3>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleExport('json')} className="flex items-center justify-center space-x-2 w-full bg-card text-foreground py-2 px-3 rounded-md border border-border hover:bg-accent transition-colors text-sm">
                    <DownloadIcon className="w-4 h-4"/>
                    <span>JSON</span>
                </button>
                 <button onClick={() => handleExport('markdown')} className="flex items-center justify-center space-x-2 w-full bg-card text-foreground py-2 px-3 rounded-md border border-border hover:bg-accent transition-colors text-sm">
                    <DownloadIcon className="w-4 h-4"/>
                    <span>Markdown</span>
                </button>
                 <button onClick={() => handleExport('csv-nodes')} className="flex items-center justify-center space-x-2 w-full bg-card text-foreground py-2 px-3 rounded-md border border-border hover:bg-accent transition-colors text-sm">
                    <DownloadIcon className="w-4 h-4"/>
                    <span>Nodes (CSV)</span>
                </button>
                 <button onClick={() => handleExport('csv-edges')} className="flex items-center justify-center space-x-2 w-full bg-card text-foreground py-2 px-3 rounded-md border border-border hover:bg-accent transition-colors text-sm">
                    <DownloadIcon className="w-4 h-4"/>
                    <span>Edges (CSV)</span>
                </button>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InputPanel;