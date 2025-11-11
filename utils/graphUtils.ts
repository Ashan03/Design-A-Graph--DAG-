
import { GraphData } from '../types';

export function topoSort(graph: GraphData): string[] {
  const { nodes, edges } = graph;
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  const nodeIds = nodes.map(n => n.id);

  nodeIds.forEach(id => {
    inDegree.set(id, 0);
    adjList.set(id, []);
  });

  edges.forEach(edge => {
    if (adjList.has(edge.source) && inDegree.has(edge.target)) {
      adjList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
    }
  });

  const queue = nodeIds.filter(id => inDegree.get(id) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    result.push(u);

    adjList.get(u)?.forEach(v => {
      inDegree.set(v, inDegree.get(v)! - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    });
  }

  if (result.length !== nodes.length) {
    throw new Error('Graph has a cycle');
  }

  return result;
}
