import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Tag } from '../types';
import { topoSort } from '../utils/graphUtils';
import { XIcon } from './icons/XIcon';

interface GraphViewProps {
  data: GraphData;
  selectedNodeId: string | null;
  onNodeClick: (node: Node) => void;
  onDeleteNode: (nodeId: string) => void;
  nodeTags: Record<string, Tag>;
}

const tagColors: Record<Tag, string> = {
    primary: 'stroke-destructive',
    secondary: 'stroke-primary',
    optional: 'stroke-green-500', // No direct theme equivalent, keeping for now
    none: 'stroke-border'
};

const nodeTypeColors = {
  'Goal': 'fill-yellow-400/80',
  'Feature': 'fill-cyan-400/80',
  'Task': 'fill-purple-400/80',
  'Constraint': 'fill-orange-400/80',
  'Idea': 'fill-lime-400/80',
};

const NODE_WIDTH = 160;

const GraphView: React.FC<GraphViewProps> = ({ data, selectedNodeId, onNodeClick, onDeleteNode, nodeTags }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [positionedNodes, setPositionedNodes] = useState<Node[]>([]);
  const containerRef = useRef<SVGGElement>(null);

  const inputsByNode = useMemo(() => {
    const inputs = new Map<string, string[]>();
    if (!data) return inputs;
    data.nodes.forEach(n => inputs.set(n.id, []));
    data.edges.forEach(e => {
        const targetInputs = inputs.get(e.target);
        if (targetInputs && !targetInputs.includes(e.label)) {
            targetInputs.push(e.label);
        }
    });
    return inputs;
  }, [data]);
  
  const nodeHeights = useMemo(() => {
    const heights = new Map<string, number>();
    if (!data) return heights;
    data.nodes.forEach(node => {
        const inputCount = inputsByNode.get(node.id)?.length || 0;
        const outputCount = node.outputs?.length || 0;
        const bodyHeight = Math.max(inputCount, outputCount) * 32;
        heights.set(node.id, Math.max(bodyHeight, 80) + 28); // 28 for header
    });
    return heights;
  }, [data, inputsByNode]);

  useEffect(() => {
    if (!data.nodes.length || !svgRef.current) return;

    const { nodes, edges } = data;
    const height = svgRef.current.parentElement?.clientHeight || 600;
    
    const layers = new Map<string, number>();
    let sortedNodeIds: string[];
    try {
      sortedNodeIds = topoSort(data);
    } catch (e) {
      console.error("Layout failed due to cycle, falling back to simple list.", e);
      sortedNodeIds = data.nodes.map(n => n.id);
    }

    sortedNodeIds.forEach(nodeId => {
      const parents = edges.filter(e => e.target === nodeId).map(e => e.source);
      let maxParentLayer = -1;
      parents.forEach(parentId => {
        const parentLayer = layers.get(parentId);
        if (parentLayer !== undefined && parentLayer > maxParentLayer) {
          maxParentLayer = parentLayer;
        }
      });
      layers.set(nodeId, maxParentLayer + 1);
    });

    const nodesByLayer: Node[][] = [];
    layers.forEach((layerIndex, nodeId) => {
      if (!nodesByLayer[layerIndex]) {
        nodesByLayer[layerIndex] = [];
      }
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        nodesByLayer[layerIndex].push(node);
      }
    });

    const PADDING_X = 280;
    const PADDING_Y = 40;
    const newNodes = nodes.map(node => {
      const layerIndex = layers.get(node.id) ?? 0;
      const layer = nodesByLayer[layerIndex] || [];
      const indexInLayer = layer.findIndex(n => n.id === node.id);
      
      let yOffset = 0;
      for (let i = 0; i < indexInLayer; i++) {
        const prevNodeIdInLayer = layer[i].id;
        yOffset += nodeHeights.get(prevNodeIdInLayer) || 0;
        yOffset += PADDING_Y;
      }

      const totalLayerHeight = layer.reduce((sum, n) => sum + (nodeHeights.get(n.id) || 0), 0) + Math.max(0, layer.length - 1) * PADDING_Y;
      const nodeHeight = nodeHeights.get(node.id) || 0;

      return {
        ...node,
        x: layerIndex * PADDING_X + 150,
        y: (height / 2) - (totalLayerHeight / 2) + yOffset + (nodeHeight / 2)
      };
    });
    setPositionedNodes(newNodes);
  }, [data, nodeHeights]);

  useEffect(() => {
    if (!svgRef.current || !positionedNodes.length) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.parentElement?.clientWidth || 800;
    const height = svgRef.current.parentElement?.clientHeight || 600;
    svg.attr('width', width).attr('height', height);
    
    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();
    
    const nodeMap = new Map(positionedNodes.map(n => [n.id, n]));
    
    const linkData = data.edges
      .map(edge => ({
        ...edge,
        sourceNode: nodeMap.get(edge.source)!,
        targetNode: nodeMap.get(edge.target)!
      }))
      .filter(e => e.sourceNode && e.targetNode);

    const links = container.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(linkData)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#a1a1aa')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    const nodes = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(positionedNodes, (d: any) => d.id)
      .join('g')
      .attr('transform', d => `translate(${d.x!}, ${d.y!})`)
      .on('click', (event, d) => onNodeClick(d as Node))
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => event.sourceEvent.stopPropagation())
        .on('drag', function(event, d: Node) {
          d.x = event.x;
          d.y = event.y;
          d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
          updatePositions();
        }));
    
    nodes.append('foreignObject')
      .attr('width', NODE_WIDTH)
      .attr('height', d => nodeHeights.get(d.id)!)
      .attr('x', -NODE_WIDTH / 2)
      .attr('y', d => -nodeHeights.get(d.id)! / 2)
      .style('overflow', 'visible')
      .append('xhtml:div')
      .attr('class', 'w-full h-full cursor-move select-none')
      .html(d => {
        const nodeHeight = nodeHeights.get(d.id)!;
        const bodyHeight = nodeHeight - 28;
        const inputs = inputsByNode.get(d.id) || [];
        const outputs = d.outputs || [];

        const inputPortsHtml = inputs.map((input, i) => `
            <div class="flex items-center gap-2 relative py-1" style="height: 32px;">
                <div class="absolute" style="left: 0; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; background-color: white; border: 1px solid #71717a;"></div>
                <span class="text-xs text-zinc-800 break-words leading-tight pr-1">${input}</span>
            </div>
        `).join('');

        const outputPortsHtml = outputs.map((output, i) => `
            <div class="flex items-center justify-end gap-2 relative py-1" style="height: 32px;">
                <span class="text-xs text-zinc-800 break-words text-right leading-tight pl-1">${output}</span>
                <div class="absolute" style="right: 0; top: 50%; transform: translate(50%, -50%); width: 10px; height: 10px; background-color: white; border: 1px solid #71717a;"></div>
            </div>
        `).join('');
        
        return `
        <div class="flex flex-col shadow-lg border ${selectedNodeId === d.id ? 'border-primary' : 'border-zinc-800'} rounded-lg">
            <div class="bg-black px-3 py-1.5 flex items-center justify-between relative rounded-t-lg" style="height: 28px;">
                <span class="text-xs text-white break-words pr-6 leading-tight">${d.label}</span>
                <button class="delete-btn absolute top-1 right-1 hover:bg-white/20 rounded p-0.5 transition-colors" data-id="${d.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>
            <div class="flex relative rounded-b-lg" style="min-height: ${bodyHeight}px; background-color: #cccccc;">
                <div class="flex-1 flex flex-col px-3 py-2">${inputs.length > 0 ? inputPortsHtml : '<div class="text-xs text-zinc-700 py-1">No inputs</div>'}</div>
                <div class="flex-1 flex flex-col px-3 py-2">${outputs.length > 0 ? outputPortsHtml : '<div class="text-xs text-zinc-700 py-1 text-right">No outputs</div>'}</div>
            </div>
        </div>
        `;
      });
      
    nodes.selectAll('.delete-btn').on('click', (event, d) => {
        event.stopPropagation();
        onDeleteNode((d as Node).id);
    });


    function getPortPosition(nodeId: string, portLabel: string, isOutput: boolean) {
        const node = nodeMap.get(nodeId);
        if (!node) return { x: 0, y: 0 };
        const nodeHeight = nodeHeights.get(node.id)!;

        let portIndex = -1;
        let x = 0;

        if (isOutput) {
            const outputs = node.outputs || [];
            portIndex = outputs.findIndex(o => o === portLabel);
            x = node.x! + NODE_WIDTH / 2;
        } else {
            const inputs = inputsByNode.get(node.id) || [];
            portIndex = inputs.findIndex(i => i === portLabel);
            x = node.x! - NODE_WIDTH / 2;
        }

        if (portIndex === -1) {
            // Fallback to node center if port not found
            return {x: node.x!, y: node.y!};
        }

        // y-position is calculated from the top of the node.
        const headerHeight = 28;
        const paddingTop = 2; // py-2 on port container
        const portRowHeight = 32;
        const nodeTopY = node.y! - nodeHeight / 2;
        const bodyTopY = nodeTopY + headerHeight;
        const portsContainerTopY = bodyTopY + paddingTop;
        
        const y = portsContainerTopY + (portIndex * portRowHeight) + (portRowHeight / 2);

        return { x, y };
    }
    
    function updatePositions() {
      links.attr('d', d => {
        const sourcePt = getPortPosition(d.source, d.label, true);
        const targetPt = getPortPosition(d.target, d.label, false);
        const controlPointOffset = Math.abs(targetPt.x - sourcePt.x) * 0.5;
        return `M ${sourcePt.x} ${sourcePt.y} C ${sourcePt.x + controlPointOffset} ${sourcePt.y}, ${targetPt.x - controlPointOffset} ${targetPt.y}, ${targetPt.x} ${targetPt.y}`;
      });
    }

    updatePositions();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

  }, [positionedNodes, data.edges, selectedNodeId, nodeTags, onNodeClick, onDeleteNode, inputsByNode, nodeHeights]);
  
  return <svg ref={svgRef} className="w-full h-full"><g ref={containerRef}></g></svg>;
};

export default GraphView;