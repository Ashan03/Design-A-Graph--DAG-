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
  const [showCelebration, setShowCelebration] = useState(false);

  const allCompleted = useMemo(() => {
    return nodes.length > 0 && nodes.every(node => completedNodes.has(node.id));
  }, [nodes, completedNodes]);

  // Show celebration when all tasks completed
  React.useEffect(() => {
    if (allCompleted && nodes.length > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, nodes.length]);

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
    <div className="w-full max-w-4xl h-full overflow-y-auto bg-background p-6 rounded-lg border border-border relative">
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white text-6xl md:text-8xl font-bold px-12 py-8 rounded-3xl shadow-2xl animate-bounce">
            🎉 🎊 ✨
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Project Checklist</h2>
        {allCompleted && nodes.length > 0 && (
          <div className="flex items-center gap-2 bg-green-500/20 border border-green-500 text-green-700 dark:text-green-400 px-4 py-2 rounded-full animate-pulse">
            <span className="text-2xl">🎉</span>
            <span className="font-bold">All Done!</span>
          </div>
        )}
      </div>
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