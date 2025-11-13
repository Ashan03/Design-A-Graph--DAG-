
import { GraphData } from '../types';

/**
 * Validate and fix a graph to ensure it's acyclic
 * @param graph - Input graph that may contain cycles
 * @returns Validated acyclic graph
 */
export function ensureAcyclicGraph(graph: GraphData): GraphData {
  if (!hasCycle(graph)) {
    return graph;
  }
  console.warn('Cycle detected in graph. Automatically removing problematic edges.');
  return breakCycles(graph);
}

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

/**
 * Detect if graph contains cycles
 */
export function hasCycle(graph: GraphData): boolean {
  const { nodes, edges } = graph;
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const adjList = new Map<string, string[]>();

  nodes.forEach(n => adjList.set(n.id, []));
  edges.forEach(e => {
    if (adjList.has(e.source)) {
      adjList.get(e.source)!.push(e.target);
    }
  });

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

/**
 * Find all cycles in the graph
 */
export function findCycles(graph: GraphData): string[][] {
  const { nodes, edges } = graph;
  const adjList = new Map<string, string[]>();
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack: string[] = [];

  nodes.forEach(n => adjList.set(n.id, []));
  edges.forEach(e => {
    if (adjList.has(e.source)) {
      adjList.get(e.source)!.push(e.target);
    }
  });

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recStack.push(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else {
        const cycleStart = recStack.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...recStack.slice(cycleStart), neighbor]);
        }
      }
    }

    recStack.pop();
  }

  for (const node of nodes) {
    visited.clear();
    recStack.length = 0;
    dfs(node.id);
  }

  return cycles;
}

/**
 * Remove edges to break cycles and make graph acyclic
 * Returns a new graph with cycles removed
 */
export function breakCycles(graph: GraphData): GraphData {
  const { nodes, edges } = graph;
  const validEdges = [...edges];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const adjList = new Map<string, Set<string>>();
  const edgesToRemove = new Set<string>();

  nodes.forEach(n => adjList.set(n.id, new Set()));
  validEdges.forEach(e => {
    if (adjList.has(e.source)) {
      adjList.get(e.source)!.add(e.target);
    }
  });

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = Array.from(adjList.get(nodeId) || []);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Found a back edge (cycle) - mark it for removal
        const edgeId = validEdges.find(e => e.source === nodeId && e.target === neighbor)?.id;
        if (edgeId) edgesToRemove.add(edgeId);
        adjList.get(nodeId)!.delete(neighbor);
      }
    }

    recStack.delete(nodeId);
  }

  // Run DFS from each node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return {
    nodes,
    edges: validEdges.filter(e => !edgesToRemove.has(e.id))
  };
}
