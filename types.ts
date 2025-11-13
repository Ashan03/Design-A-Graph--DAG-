
export type CoreType = 'Goal' | 'Feature' | 'Task' | 'Constraint' | 'Idea';

export type ModuleType =
  | 'ui'
  | 'backend'
  | 'storage'
  | 'ml-model'
  | 'data-pipeline'
  | 'schema'
  | 'infra'
  | 'integration'
  | 'logic';

export interface Node {
  id: string;
  label: string;
  description: string;
  type: CoreType; // business / PRD classification
  moduleType?: ModuleType; // technical facet
  outputs?: string[];
  inputs?: string[]; // explicit named artifacts consumed
  owners?: string[]; // e.g. ['frontend','backend','ml']
  stack?: string[]; // tech keywords: ['react','s3','python','opencv']
  layer?: number; // layout or maturity ordering
  status?: 'planned' | 'in-progress' | 'done';
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