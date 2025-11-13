import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Tag } from '../types';
import { topoSort } from '../utils/graphUtils';
import { optimizeLayerOrdering } from '../utils/layoutUtils';

interface GraphViewProps {
  data: GraphData;
  selectedNodeId: string | null;
  onNodeClick: (node: Node) => void;
  onDeleteNode: (nodeId: string) => void;
  nodeTags: Record<string, Tag>;
  showOnlySelectedContext?: boolean; // when true, hide nodes/edges not directly connected to selected
  completedNodes?: Set<string>;
  readyToWorkNodes?: Set<string>;
}

const tagColors: Record<Tag, string> = {
    primary: 'stroke-destructive',
    secondary: 'stroke-primary',
    optional: 'stroke-green-500', // No direct theme equivalent, keeping for now
    none: 'stroke-border'
};

const nodeTypeColors: Record<string,string> = {
  Goal: 'fill-yellow-400/80',
  Feature: 'fill-cyan-400/80',
  Task: 'fill-purple-400/80',
  Constraint: 'fill-orange-400/80',
  Idea: 'fill-lime-400/80',
};

const moduleTypeBorders: Record<string,string> = {
  ui: 'border-blue-500',
  backend: 'border-emerald-500',
  storage: 'border-orange-500',
  'ml-model': 'border-fuchsia-500',
  'data-pipeline': 'border-cyan-600',
  schema: 'border-indigo-500',
  infra: 'border-red-600',
  integration: 'border-teal-500',
  logic: 'border-zinc-700'
};

const MIN_NODE_WIDTH = 160;
const MAX_NODE_WIDTH = 320;
// Port UI constants: px-3 = 12px padding on each side of the body columns
const PORT_SIZE = 12; // diameter in px
const BODY_PAD_X = 12; // from Tailwind px-3

const GraphView: React.FC<GraphViewProps> = ({ data, selectedNodeId, onNodeClick, onDeleteNode, nodeTags, showOnlySelectedContext = false, completedNodes = new Set(), readyToWorkNodes = new Set() }) => {
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

  const nodeWidths = useMemo(() => {
    const widths = new Map<string, number>();
    if (!data) return widths;
    data.nodes.forEach(node => {
      const inputs = inputsByNode.get(node.id) || [];
      const outputs = node.outputs || [];
      
      // Estimate width based on text length (rough: ~7px per char for text-xs)
      const labelWidth = node.label.length * 8 + 60; // +60 for padding and delete button
      const maxInputWidth = Math.max(0, ...inputs.map(i => i.length * 7 + 30));
      const maxOutputWidth = Math.max(0, ...outputs.map(o => o.length * 7 + 30));
      const contentWidth = Math.max(maxInputWidth + maxOutputWidth, 120);
      
      const calculatedWidth = Math.max(labelWidth, contentWidth);
      const finalWidth = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, calculatedWidth));
      widths.set(node.id, finalWidth);
    });
    return widths;
  }, [data, inputsByNode]);
  
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
    const width = svgRef.current.parentElement?.clientWidth || 800;
    
    const layers = new Map<string, number>();
    let sortedNodeIds: string[];
    try {
      sortedNodeIds = topoSort(data);
    } catch (e) {
      console.error("Layout failed due to cycle, falling back to simple list.", e);
      sortedNodeIds = data.nodes.map(n => n.id);
    }

    // Assign layers based on longest path from root
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

    // Group nodes by layer
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

    // Sort nodes within each layer by moduleType to group related components
    const moduleTypePriority: Record<string, number> = {
      'infra': 0,
      'storage': 1,
      'schema': 2,
      'backend': 3,
      'data-pipeline': 4,
      'ml-model': 5,
      'integration': 6,
      'logic': 7,
      'ui': 8
    };

    nodesByLayer.forEach(layer => {
      layer.sort((a, b) => {
        const aType = a.moduleType || 'logic';
        const bType = b.moduleType || 'logic';
        const aPriority = moduleTypePriority[aType] ?? 10;
        const bPriority = moduleTypePriority[bType] ?? 10;
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Secondary sort by number of connections (more connected nodes first)
        const aConnections = edges.filter(e => e.source === a.id || e.target === a.id).length;
        const bConnections = edges.filter(e => e.source === b.id || e.target === b.id).length;
        return bConnections - aConnections;
      });
    });

    // Optimize layer ordering to reduce edge crossings
    const optimizedLayers = optimizeLayerOrdering(nodesByLayer, edges);

    // Calculate dynamic spacing based on layer count and viewport
    const numLayers = optimizedLayers.length;
    
    // Find maximum node width to ensure no horizontal overlap
    const maxNodeWidth = Math.max(...Array.from(nodeWidths.values()));
    const PADDING_X = Math.max(maxNodeWidth + 120, Math.min(500, width / (numLayers + 1)));
    const MIN_PADDING_Y = 80; // Increased for better vertical spacing
    const LAYER_START_X = 150;

    const newNodes = nodes.map(node => {
      const layerIndex = layers.get(node.id) ?? 0;
      const layer = optimizedLayers[layerIndex] || [];
      const indexInLayer = layer.findIndex(n => n.id === node.id);
      
      // Calculate cumulative Y offset with actual node heights
      let yOffset = 0;
      for (let i = 0; i < indexInLayer; i++) {
        const prevNodeIdInLayer = layer[i].id;
        const prevNodeHeight = nodeHeights.get(prevNodeIdInLayer) || 0;
        yOffset += prevNodeHeight + MIN_PADDING_Y;
      }

      // Calculate total layer height for centering
      const totalLayerHeight = layer.reduce((sum, n) => sum + (nodeHeights.get(n.id) || 0), 0) + 
                               Math.max(0, layer.length - 1) * MIN_PADDING_Y;
      const nodeHeight = nodeHeights.get(node.id) || 0;

      // Center vertically and distribute horizontally
      return {
        ...node,
        x: LAYER_START_X + layerIndex * PADDING_X,
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

    // Create SVG pattern for infinite grid
    svg.select('defs').remove();
    const defs = svg.append('defs');
    const gridSize = 40;
    
    const pattern = defs.append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', gridSize)
      .attr('height', gridSize)
      .attr('patternUnits', 'userSpaceOnUse');
    
    pattern.append('path')
      .attr('d', `M ${gridSize} 0 L 0 0 0 ${gridSize}`)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.2);
    
    // Add large rect with pattern fill (extends far beyond viewport)
    container.append('rect')
      .attr('class', 'grid')
      .attr('x', -10000)
      .attr('y', -10000)
      .attr('width', 20000)
      .attr('height', 20000)
      .attr('fill', 'url(#grid-pattern)');
    
    const nodeMap = new Map(positionedNodes.map(n => [n.id, n]));
    
    let linkData = data.edges
      .map(edge => ({
        ...edge,
        sourceNode: nodeMap.get(edge.source)!,
        targetNode: nodeMap.get(edge.target)!
      }))
      .filter(e => e.sourceNode && e.targetNode);

    let visibleNodeIds: Set<string> | null = null;
    if (showOnlySelectedContext && selectedNodeId) {
      visibleNodeIds = new Set<string>();
      visibleNodeIds.add(selectedNodeId);
      // collect directly connected neighbors
      linkData.forEach(l => {
        if (l.source === selectedNodeId) visibleNodeIds!.add(l.target);
        if (l.target === selectedNodeId) visibleNodeIds!.add(l.source);
      });
      // filter links to only those touching selected
      linkData = linkData.filter(l => l.source === selectedNodeId || l.target === selectedNodeId);
    }

    // Fan-out config
    const SIBLING_SPREAD = 8; // px vertical separation per sibling step

    // Build sibling grouping metadata after filtering
    type LinkExt = typeof linkData[number];
    const edgeMeta = new Map<string, { sIndex: number; sCount: number; tIndex: number; tCount: number }>();

    // Create source groups keyed by source+label
    const sourceGroups = new Map<string, LinkExt[]>();
    linkData.forEach(e => {
      const key = `${e.source}|${e.label}`;
      if (!sourceGroups.has(key)) sourceGroups.set(key, []);
      sourceGroups.get(key)!.push(e);
    });
    // sort and assign indices for source groups
    sourceGroups.forEach(arr => {
      arr.sort((a, b) => (a.targetNode.y! - b.targetNode.y!) || (a.targetNode.x! - b.targetNode.x!) || a.id.localeCompare(b.id));
      const count = arr.length;
      arr.forEach((e, i) => {
        const meta = edgeMeta.get(e.id) || { sIndex: 0, sCount: 1, tIndex: 0, tCount: 1 };
        meta.sIndex = i;
        meta.sCount = count;
        edgeMeta.set(e.id, meta);
      });
    });

    // Create target groups keyed by target+label
    const targetGroups = new Map<string, LinkExt[]>();
    linkData.forEach(e => {
      const key = `${e.target}|${e.label}`;
      if (!targetGroups.has(key)) targetGroups.set(key, []);
      targetGroups.get(key)!.push(e);
    });
    // sort and assign indices for target groups
    targetGroups.forEach(arr => {
      arr.sort((a, b) => (a.sourceNode.y! - b.sourceNode.y!) || (a.sourceNode.x! - b.sourceNode.x!) || a.id.localeCompare(b.id));
      const count = arr.length;
      arr.forEach((e, i) => {
        const meta = edgeMeta.get(e.id) || { sIndex: 0, sCount: 1, tIndex: 0, tCount: 1 };
        meta.tIndex = i;
        meta.tCount = count;
        edgeMeta.set(e.id, meta);
      });
    });

    const links = container.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(linkData)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#a1a1aa')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9)
      .attr('stroke-linecap', 'round');

    const nodes = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(positionedNodes.filter(n => {
        if (!visibleNodeIds) return true;
        return visibleNodeIds.has(n.id);
      }), (d: any) => d.id)
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
      .attr('width', d => nodeWidths.get(d.id)!)
      .attr('height', d => nodeHeights.get(d.id)!)
      .attr('x', d => -nodeWidths.get(d.id)! / 2)
      .attr('y', d => -nodeHeights.get(d.id)! / 2)
      .style('overflow', 'visible')
      .append('xhtml:div')
      .attr('class', 'w-full h-full cursor-move select-none')
      .style('opacity', d => completedNodes.has(d.id) ? '0.5' : '1')
      .html(d => {
        const nodeHeight = nodeHeights.get(d.id)!;
        const bodyHeight = nodeHeight - 28;
        const inputs = inputsByNode.get(d.id) || [];
        const outputs = d.outputs || [];

        const inputPortsHtml = inputs.map((input, i) => `
          <div class="flex items-center gap-2 relative py-1" style="height: 32px;">
            <div class="absolute rounded-full" style="left: ${-(BODY_PAD_X + PORT_SIZE/2)}px; top: 50%; transform: translateY(-50%); width: ${PORT_SIZE}px; height: ${PORT_SIZE}px; background-color: white; border: 1px solid #71717a; pointer-events: none;"></div>
                <span class="text-xs text-zinc-800 break-words leading-tight pr-1">${input}</span>
            </div>
        `).join('');

        const outputPortsHtml = outputs.map((output, i) => `
          <div class="flex items-center justify-end gap-2 relative py-1" style="height: 32px;">
            <span class="text-xs text-zinc-800 break-words text-right leading-tight pl-1">${output}</span>
            <div class="absolute rounded-full" style="right: ${-(BODY_PAD_X + PORT_SIZE/2)}px; top: 50%; transform: translateY(-50%); width: ${PORT_SIZE}px; height: ${PORT_SIZE}px; background-color: white; border: 1px solid #71717a; pointer-events: none;"></div>
            </div>
        `).join('');
        
        const moduleBorder = d.moduleType ? moduleTypeBorders[d.moduleType] || 'border-zinc-800' : 'border-zinc-800';
        const isReadyToWork = readyToWorkNodes.has(d.id);
        const borderClass = selectedNodeId === d.id ? 'border-primary' : isReadyToWork ? 'border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.3)]' : moduleBorder;
        return `
        <div class="flex flex-col shadow-lg border ${borderClass} rounded-lg">
            <div class="bg-black px-3 py-1.5 flex items-center justify-between relative rounded-t-lg" style="height: 28px;">
            <span class="text-xs text-white break-words pr-6 leading-tight">${d.label}</span>
            ${d.moduleType ? `<span class="absolute left-2 -top-2 text-[10px] px-1 py-0.5 rounded bg-white/10 border border-white/20 text-white">${d.moduleType}</span>` : ''}
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
        const nodeWidth = nodeWidths.get(node.id)!;

        let portIndex = -1;
        let x = 0;

        if (isOutput) {
            const outputs = node.outputs || [];
            portIndex = outputs.findIndex(o => o === portLabel);
          // center of right port dot (placed outside the body padding)
          x = node.x! + nodeWidth / 2 + PORT_SIZE/2;
        } else {
            const inputs = inputsByNode.get(node.id) || [];
            portIndex = inputs.findIndex(i => i === portLabel);
          // center of left port dot
          x = node.x! - nodeWidth / 2 - PORT_SIZE/2;
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
        const dx = Math.abs(targetPt.x - sourcePt.x);
        const controlPointOffset = dx * 0.5;

        // Fan-out offsets
        const meta = edgeMeta.get(d.id) || { sIndex: 0, sCount: 1, tIndex: 0, tCount: 1 };
        const sCenter = meta.sIndex - (meta.sCount - 1) / 2;
        const tCenter = meta.tIndex - (meta.tCount - 1) / 2;
        // Reduce spread when dx is very small to avoid excessive curvature
        const spreadScale = Math.min(1, dx / 120);
        const spread = SIBLING_SPREAD * spreadScale;

        const c1x = sourcePt.x + controlPointOffset;
        const c2x = targetPt.x - controlPointOffset;
        const c1y = sourcePt.y + sCenter * spread;
        const c2y = targetPt.y + tCenter * spread;

        return `M ${sourcePt.x} ${sourcePt.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${targetPt.x} ${targetPt.y}`;
      });
    }

    updatePositions();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

  }, [positionedNodes, data.edges, selectedNodeId, nodeTags, onNodeClick, onDeleteNode, inputsByNode, nodeHeights, nodeWidths, showOnlySelectedContext, completedNodes, readyToWorkNodes]);
  
  return <svg ref={svgRef} className="w-full h-full"><g ref={containerRef}></g></svg>;
};

export default GraphView;