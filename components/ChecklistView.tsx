import React, { useState, useMemo } from 'react';
import { Node, Edge } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ChecklistViewProps {
  nodes: Node[];
  edges: Edge[];
  completedNodes: Set<string>;
  onToggleComplete: (nodeId: string) => void;
  readyToWorkNodes: Set<string>;
}

const ChecklistView: React.FC<ChecklistViewProps> = ({ nodes, edges, completedNodes, onToggleComplete, readyToWorkNodes }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dependencies = useMemo(() => {
    const deps = new Map<string, string[]>();
    nodes.forEach(node => deps.set(node.id, []));
    edges.forEach(edge => {
      deps.get(edge.target)?.push(edge.source);
    });
    return deps;
  }, [nodes, edges]);

  const toggleExpanded = (nodeId: string) => {
    setExpanded(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  };

  return (
    <div className="w-full max-w-4xl h-full overflow-y-auto bg-background p-6 rounded-lg border border-border">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Project Checklist</h2>
      <p className="text-muted-foreground mb-6">This list is ordered by project dependencies. Check items as you complete them.</p>
      <ul className="space-y-3">
        {nodes.map(node => {
          const nodeDeps = dependencies.get(node.id) || [];
          const isEnabled = nodeDeps.every(depId => completedNodes.has(depId));
          const isItemCompleted = completedNodes.has(node.id);
          const isItemExpanded = expanded.has(node.id);
          const isReadyToWork = readyToWorkNodes.has(node.id);

          return (
            <li 
              key={node.id} 
              className={`bg-card p-4 rounded-lg border transition-opacity relative ${
                !isEnabled ? 'opacity-50 border-border' : 
                isReadyToWork ? 'border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]' : 
                'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => isEnabled && onToggleComplete(node.id)}
                    disabled={!isEnabled}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      isEnabled ? 'border-primary cursor-pointer hover:bg-primary/20' : 'border-muted-foreground cursor-not-allowed'
                    } ${isItemCompleted ? 'bg-primary border-primary' : 'bg-transparent'}`}
                  >
                    {isItemCompleted && <CheckIcon className="w-4 h-4 text-primary-foreground" />}
                  </button>
                  <span className={`font-medium ${isItemCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {node.label}
                  </span>
                </div>
                <button onClick={() => toggleExpanded(node.id)} className="p-1 rounded-full hover:bg-accent">
                   <ChevronDownIcon className={`w-5 h-5 text-muted-foreground transition-transform ${isItemExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isItemExpanded && (
                  <div className="mt-3 pl-10 text-muted-foreground text-sm space-y-2">
                      <p><strong className="text-foreground">Description:</strong> {node.description}</p>
                      <p><strong className="text-foreground">Type:</strong> {node.type}</p>
                      {nodeDeps.length > 0 && (
                          <div>
                              <strong className="text-foreground">Dependencies:</strong>
                              <ul className="list-disc pl-5">
                                {nodeDeps.map(depId => {
                                    const depNode = nodes.find(n => n.id === depId);
                                    return <li key={depId}>{depNode?.label || depId}</li>
                                })}
                              </ul>
                          </div>
                      )}
                  </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChecklistView;