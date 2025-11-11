
export interface Node {
  id: string;
  label: string;
  description: string;
  type: 'Goal' | 'Feature' | 'Task' | 'Constraint' | 'Idea';
  outputs?: string[];
  x?: number;
  y?: number;
}

export interface Edge {
  id:string;
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export type ViewMode = 'graph' | 'checklist';

export type Tag = 'primary' | 'secondary' | 'optional' | 'none';