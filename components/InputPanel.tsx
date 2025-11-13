import React, { useRef, useState } from 'react';
import { GraphData } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { processDocument } from '../services/documentProcessor';

interface InputPanelProps {
  documentText: string;
  setDocumentText: (text: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
  graphData: GraphData | null;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  documentText,
  setDocumentText,
  onGenerate,
  isLoading,
  error,
  graphData,
  apiKey,
  setApiKey,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFileError(null);

    try {
      const processedText = await processDocument(file, apiKey);
      setDocumentText(processedText);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process file';
      setFileError(errorMsg);
      console.error('File processing error:', err);
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
    
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
      
      {/* API Key Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="api-key">
          Google Gemini API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Gemini API key..."
          className="w-full p-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Get your free API key from{' '}
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Google AI Studio
          </a>
        </p>
      </div>
      
      {/* File Upload Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Upload Document
        </label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex-1 cursor-pointer bg-card border border-border text-foreground py-2 px-4 rounded-md hover:bg-accent transition-colors text-center text-sm font-medium"
          >
            {isProcessingFile ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              '📄 Upload PDF, TXT, MD, or DOCX'
            )}
          </label>
        </div>
        {fileError && <p className="text-destructive text-xs">{fileError}</p>}
        <p className="text-xs text-muted-foreground">Upload a file to auto-extract project details, or paste text below.</p>
      </div>

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