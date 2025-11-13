/**
 * Layout optimization utilities for graph visualization
 */

import { Node, Edge } from '../types';

/**
 * Calculate the barycenter (average position) of a node's neighbors
 * Used for reducing edge crossings
 */
export function calculateBarycenter(
  node: Node,
  neighbors: Node[],
  direction: 'incoming' | 'outgoing'
): number {
  if (neighbors.length === 0) return 0;
  
  const sum = neighbors.reduce((acc, n) => acc + (n.y || 0), 0);
  return sum / neighbors.length;
}

/**
 * Reduce edge crossings using barycentric ordering
 * This implements a simple layer-by-layer sweep to minimize crossings
 */
export function optimizeLayerOrdering(
  nodesByLayer: Node[][],
  edges: Edge[]
): Node[][] {
  const optimized = nodesByLayer.map(layer => [...layer]);
  
  // Build adjacency maps
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    outgoing.get(edge.source)!.push(edge.target);
    incoming.get(edge.target)!.push(edge.source);
  });
  
  // Sweep through layers multiple times
  const iterations = 3;
  for (let iter = 0; iter < iterations; iter++) {
    // Forward sweep
    for (let i = 1; i < optimized.length; i++) {
      const layer = optimized[i];
      const prevLayer = optimized[i - 1];
      
      layer.sort((a, b) => {
        const aParents = (incoming.get(a.id) || [])
          .map(id => prevLayer.find(n => n.id === id))
          .filter((n): n is Node => !!n);
        const bParents = (incoming.get(b.id) || [])
          .map(id => prevLayer.find(n => n.id === id))
          .filter((n): n is Node => !!n);
        
        const aBarycenter = calculateBarycenter(a, aParents, 'incoming');
        const bBarycenter = calculateBarycenter(b, bParents, 'incoming');
        
        return aBarycenter - bBarycenter;
      });
    }
    
    // Backward sweep
    for (let i = optimized.length - 2; i >= 0; i--) {
      const layer = optimized[i];
      const nextLayer = optimized[i + 1];
      
      layer.sort((a, b) => {
        const aChildren = (outgoing.get(a.id) || [])
          .map(id => nextLayer.find(n => n.id === id))
          .filter((n): n is Node => !!n);
        const bChildren = (outgoing.get(b.id) || [])
          .map(id => nextLayer.find(n => n.id === id))
          .filter((n): n is Node => !!n);
        
        const aBarycenter = calculateBarycenter(a, aChildren, 'outgoing');
        const bBarycenter = calculateBarycenter(b, bChildren, 'outgoing');
        
        return aBarycenter - bBarycenter;
      });
    }
  }
  
  return optimized;
}

/**
 * Count the number of edge crossings between two layers
 */
export function countCrossings(
  layer1: Node[],
  layer2: Node[],
  edges: Edge[]
): number {
  let crossings = 0;
  
  const layer1Positions = new Map(layer1.map((n, i) => [n.id, i]));
  const layer2Positions = new Map(layer2.map((n, i) => [n.id, i]));
  
  const relevantEdges = edges.filter(
    e => layer1Positions.has(e.source) && layer2Positions.has(e.target)
  );
  
  for (let i = 0; i < relevantEdges.length; i++) {
    for (let j = i + 1; j < relevantEdges.length; j++) {
      const e1 = relevantEdges[i];
      const e2 = relevantEdges[j];
      
      const e1SourcePos = layer1Positions.get(e1.source)!;
      const e1TargetPos = layer2Positions.get(e1.target)!;
      const e2SourcePos = layer1Positions.get(e2.source)!;
      const e2TargetPos = layer2Positions.get(e2.target)!;
      
      // Check if edges cross
      if ((e1SourcePos < e2SourcePos && e1TargetPos > e2TargetPos) ||
          (e1SourcePos > e2SourcePos && e1TargetPos < e2TargetPos)) {
        crossings++;
      }
    }
  }
  
  return crossings;
}
