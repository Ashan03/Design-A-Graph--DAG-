import { X } from 'lucide-react';
import { NodeType } from './NodeEditor';

interface GrasshopperNodeProps {
  node: NodeType;
  onMouseDown: (nodeId: string, e: React.MouseEvent) => void;
  onOutputMouseDown: (
    nodeId: string,
    outputId: string,
    position: { x: number; y: number },
    e: React.MouseEvent
  ) => void;
  onInputMouseUp: (nodeId: string, inputId: string, e: React.MouseEvent) => void;
  onDelete: (nodeId: string) => void;
  getPortPosition: (nodeId: string, portId: string, isOutput: boolean) => { x: number; y: number };
}

export function GrasshopperNode({
  node,
  onMouseDown,
  onOutputMouseDown,
  onInputMouseUp,
  onDelete,
  getPortPosition
}: GrasshopperNodeProps) {
  const inputHeight = node.inputs.length * 32;
  const outputHeight = node.outputs.length * 32;
  const bodyHeight = Math.max(inputHeight, outputHeight, 80);

  return (
    <div
      className="absolute cursor-move select-none"
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={e => onMouseDown(node.id, e)}
    >
      {/* Main node container */}
      <div className="flex flex-col rounded-lg overflow-hidden shadow-lg" style={{ width: 160 }}>
        {/* Top bar with node type name */}
        <div 
          className="bg-zinc-500 grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-2"
          style={{
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.3)'
          }}
        >
          <span className="block text-xs text-white break-words min-w-0 hyphens-auto leading-[1.15]">
            {node.type}
          </span>
          <button
            className="justify-self-end self-center hover:bg-white/20 rounded p-0.5 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onDelete(node.id);
            }}
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Body with gradient background */}
        <div 
          className="flex relative"
          style={{
            minHeight: bodyHeight,
            background: 'radial-gradient(circle at 100% 50%, rgba(255,255,255,0.3) 0%, rgba(200,200,200,0.1) 40%, rgba(160,160,160,0.05) 100%), linear-gradient(to bottom, #d4d4d8, #a1a1aa)'
          }}
        >
          {/* Left section with inputs */}
          <div className="flex-1 flex flex-col justify-around px-3 py-2">
            {node.inputs.length > 0 ? (
              node.inputs.map((input) => (
                <div key={input.id} className="relative py-1 pl-5 min-w-0">
                  <div
                    className="absolute rounded-r-full cursor-pointer hover:bg-zinc-100 pointer-events-auto shadow-sm"
                    style={{ 
                      left: 0,
                      top: '50%', 
                      transform: 'translate(-50%, -50%)',
                      width: '12px',
                      height: '16px',
                      backgroundColor: 'white',
                      border: '2px solid #71717a',
                      borderLeft: 'none'
                    }}
                    onMouseUp={e => onInputMouseUp(node.id, input.id, e)}
                  />
                  <span className="block text-xs text-zinc-800 break-words leading-tight">{input.label}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-700 py-1">No inputs</div>
            )}
          </div>

          {/* Right section with outputs */}
          <div className="flex-1 flex flex-col justify-around px-3 py-2">
            {node.outputs.length > 0 ? (
              node.outputs.map((output) => {
                const portPos = getPortPosition(node.id, output.id, true);
                return (
                  <div key={output.id} className="relative py-1 pr-5 min-w-0 text-right">
                    <span className="inline-block text-xs text-zinc-800 break-words text-right leading-tight">{output.label}</span>
                    <div
                      className="absolute rounded-l-full cursor-pointer hover:bg-zinc-600 pointer-events-auto shadow-sm"
                      style={{ 
                        right: 0,
                        top: '50%', 
                        transform: 'translate(50%, -50%)',
                        width: '12px',
                        height: '16px',
                        backgroundColor: '#71717a',
                        borderRight: 'none'
                      }}
                      onMouseDown={e => {
                        e.stopPropagation();
                        onOutputMouseDown(node.id, output.id, portPos, e);
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-zinc-700 py-1 text-right">No outputs</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}