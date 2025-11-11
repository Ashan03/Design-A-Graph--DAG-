import { useState, useRef, useCallback } from 'react';
import { GrasshopperNode } from './GrasshopperNode';
import { ConnectionWire } from './ConnectionWire';
import { Plus, Circle, Square, Triangle } from 'lucide-react';
import { Button } from './ui/button';

export interface NodeType {
  id: string;
  type: string;
  position: { x: number; y: number };
  inputs: { id: string; label: string; connected?: string }[];
  outputs: { id: string; label: string }[];
  color: string;
}

export interface Connection {
  id: string;
  from: { nodeId: string; outputId: string };
  to: { nodeId: string; inputId: string };
}

export function NodeEditor() {
  const [nodes, setNodes] = useState<NodeType[]>([
    {
      id: 'node-1',
      type: 'Number Slider',
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out-1', label: 'Value' }],
      color: '#9ca3af'
    },
    {
      id: 'node-2',
      type: 'Addition',
      position: { x: 350, y: 100 },
      inputs: [
        { id: 'in-1', label: 'Input A' },
        { id: 'in-2', label: 'Input B' }
      ],
      outputs: [{ id: 'out-1', label: 'Result' }],
      color: '#60a5fa'
    },
    {
      id: 'node-3',
      type: 'Circle',
      position: { x: 100, y: 280 },
      inputs: [
        { id: 'in-1', label: 'Center Point' },
        { id: 'in-2', label: 'Radius' }
      ],
      outputs: [{ id: 'out-1', label: 'Circle Curve' }],
      color: '#34d399'
    }
  ]);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    outputId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [tempConnectionEnd, setTempConnectionEnd] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNode(nodeId);
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      });
    }
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      setNodes(prev =>
        prev.map(node =>
          node.id === draggingNode
            ? {
                ...node,
                position: {
                  x: e.clientX - dragOffset.x,
                  y: e.clientY - dragOffset.y
                }
              }
            : node
        )
      );
    }

    if (connectingFrom) {
      setTempConnectionEnd({ x: e.clientX, y: e.clientY });
    }
  }, [draggingNode, dragOffset, connectingFrom]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    if (connectingFrom) {
      setConnectingFrom(null);
      setTempConnectionEnd(null);
    }
  }, [connectingFrom]);

  const handleOutputMouseDown = useCallback(
    (nodeId: string, outputId: string, position: { x: number; y: number }, e: React.MouseEvent) => {
      e.stopPropagation();
      setConnectingFrom({ nodeId, outputId, position });
      setTempConnectionEnd({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleInputMouseUp = useCallback(
    (nodeId: string, inputId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (connectingFrom && connectingFrom.nodeId !== nodeId) {
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          from: { nodeId: connectingFrom.nodeId, outputId: connectingFrom.outputId },
          to: { nodeId, inputId }
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setConnectingFrom(null);
      setTempConnectionEnd(null);
    },
    [connectingFrom]
  );

  const addNode = (type: string, color: string, inputs: any[], outputs: any[]) => {
    const newNode: NodeType = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 150, y: 300 },
      inputs,
      outputs,
      color
    };
    setNodes(prev => [...prev, newNode]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev =>
      prev.filter(c => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId)
    );
  };

  const getPortPosition = (nodeId: string, portId: string, isOutput: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const inputHeight = node.inputs.length * 32;
    const outputHeight = node.outputs.length * 32;
    const bodyHeight = Math.max(inputHeight, outputHeight, 80);
    const topBarHeight = 28;

    if (isOutput) {
      const portIndex = node.outputs.findIndex(o => o.id === portId);
      const spacing = bodyHeight / (node.outputs.length + 1);
      const portY = spacing * (portIndex + 1);
      return {
        x: node.position.x + 160 + 6,
        y: node.position.y + topBarHeight + portY
      };
    } else {
      const portIndex = node.inputs.findIndex(i => i.id === portId);
      const spacing = bodyHeight / (node.inputs.length + 1);
      const portY = spacing * (portIndex + 1);
      return {
        x: node.position.x - 6,
        y: node.position.y + topBarHeight + portY
      };
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-zinc-200 p-4 flex gap-2">
        <Button
          onClick={() =>
            addNode('Number', '#9ca3af', [], [{ id: 'out-1', label: 'Value' }])
          }
          variant="outline"
          size="sm"
        >
          <Circle className="w-4 h-4 mr-2" />
          Number
        </Button>
        <Button
          onClick={() =>
            addNode(
              'Math Operation',
              '#60a5fa',
              [
                { id: 'in-1', label: 'Input A' },
                { id: 'in-2', label: 'Input B' }
              ],
              [{ id: 'out-1', label: 'Result' }]
            )
          }
          variant="outline"
          size="sm"
        >
          <Square className="w-4 h-4 mr-2" />
          Math
        </Button>
        <Button
          onClick={() =>
            addNode(
              'Geometry',
              '#34d399',
              [
                { id: 'in-1', label: 'Center Point' },
                { id: 'in-2', label: 'Radius Value' }
              ],
              [{ id: 'out-1', label: 'Geometry Output' }]
            )
          }
          variant="outline"
          size="sm"
        >
          <Triangle className="w-4 h-4 mr-2" />
          Geometry
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-zinc-100"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      >
        {/* SVG for connections */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          {connections.map(conn => {
            const start = getPortPosition(conn.from.nodeId, conn.from.outputId, true);
            const end = getPortPosition(conn.to.nodeId, conn.to.inputId, false);
            return (
              <ConnectionWire
                key={conn.id}
                start={start}
                end={end}
              />
            );
          })}
          {connectingFrom && tempConnectionEnd && (
            <ConnectionWire
              start={connectingFrom.position}
              end={tempConnectionEnd}
              isTemporary
            />
          )}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <GrasshopperNode
            key={node.id}
            node={node}
            onMouseDown={handleMouseDown}
            onOutputMouseDown={handleOutputMouseDown}
            onInputMouseUp={handleInputMouseUp}
            onDelete={deleteNode}
            getPortPosition={getPortPosition}
          />
        ))}
      </div>
    </div>
  );
}