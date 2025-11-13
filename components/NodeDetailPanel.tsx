import React, { useState, useEffect } from 'react';
import { Node, Tag } from '../types';

interface NodeDetailPanelProps {
  node: Node;
  tag: Tag;
  onUpdateNode: (node: Node) => void;
  onUpdateTag: (nodeId: string, tag: Tag) => void;
  onClose: () => void;
}

const tagOptions: { value: Tag; label: string, color: string }[] = [
    { value: 'none', label: 'None', color: 'bg-gray-400' },
    { value: 'primary', label: 'Primary', color: 'bg-red-500' },
    { value: 'secondary', label: 'Secondary', color: 'bg-blue-500' },
    { value: 'optional', label: 'Optional', color: 'bg-green-500' }
];

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, tag, onUpdateNode, onUpdateTag, onClose }) => {
  const [editableNode, setEditableNode] = useState(node);

  useEffect(() => {
    setEditableNode(node);
  }, [node]);

  const handleChange = (field: keyof Node, value: string) => {
    setEditableNode(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = () => {
    onUpdateNode(editableNode);
  };
  
  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTag(node.id, e.target.value as Tag);
  };


  return (
    <div className="bg-card p-4 rounded-lg border border-border space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Node Details</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Label</label>
        <input
          type="text"
          value={editableNode.label}
          onChange={(e) => handleChange('label', e.target.value)}
          onBlur={handleBlur}
          className="w-full p-1 bg-input border border-border rounded-md mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea
          value={editableNode.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={handleBlur}
          className="w-full p-1 bg-input border border-border rounded-md mt-1 h-24 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <p className="p-1 bg-input border border-transparent rounded-md mt-1">{editableNode.type}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tag</label>
          <select
              value={tag}
              onChange={handleTagChange}
              className="w-full p-1 bg-input border border-border rounded-md mt-1"
          >
              {tagOptions.map(option => (
                  <option key={option.value} value={option.value}>
                      {option.label}
                  </option>
              ))}
          </select>
        </div>
      </div>
      
      {editableNode.implementationType && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Implementation Type</label>
          <div className="p-2 bg-accent/50 border border-border rounded-md mt-1 flex items-center gap-2">
            <span className="text-xs">🔧</span>
            <span className="text-sm font-medium">{editableNode.implementationType}</span>
          </div>
        </div>
      )}
      
      {editableNode.inputs && editableNode.inputs.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Inputs</label>
          <div className="mt-1 space-y-1">
            {editableNode.inputs.map((input, idx) => (
              <div key={idx} className="text-xs p-1 bg-blue-500/10 border border-blue-500/30 rounded">
                📥 {input}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {editableNode.outputs && editableNode.outputs.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Outputs</label>
          <div className="mt-1 space-y-1">
            {editableNode.outputs.map((output, idx) => (
              <div key={idx} className="text-xs p-1 bg-green-500/10 border border-green-500/30 rounded">
                📤 {output}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {editableNode.resourceLinks && editableNode.resourceLinks.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Learning Resources</label>
          <div className="mt-1 space-y-2">
            {editableNode.resourceLinks.map((resource, idx) => (
              <a
                key={idx}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-card border border-border rounded-md hover:bg-accent transition-colors text-xs group"
              >
                <span className="text-base">
                  {resource.type === 'docs' && '📚'}
                  {resource.type === 'tutorial' && '📝'}
                  {resource.type === 'video' && '🎥'}
                  {resource.type === 'forum' && '💬'}
                </span>
                <span className="flex-1 group-hover:text-primary">{resource.title}</span>
                <span className="text-muted-foreground group-hover:text-primary">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeDetailPanel;