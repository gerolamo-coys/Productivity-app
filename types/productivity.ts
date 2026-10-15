export type EffortLevel = '5min' | '15min' | '30min' | '1h+' | 'deep_work';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'paused';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface AreaDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  contentSnippet: string; // Texto extraído do arquivo (PDF, TXT, MD)
  isActive: boolean;
  fileSize?: number;
}

export interface AIBrief {
  summary: string;             // 1-2 frases concisas e acionáveis
  suggestedSteps: string[];    // 3-4 passos táticos
  estimatedEffort: EffortLevel; // Categoria de esforço
  keyTips?: string[];          // Dicas ou fórmulas personalizadas ao contexto
  groundedDocuments?: string[]; // Nomes dos arquivos de materiais de apoio que embasaram o guia
  generatedAt: string;
  modelUsed?: string;
}

export interface PauseContext {
  note: string;                // Nota de "Onde eu parei..."
  lastResumedAt?: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  name: string;                // Ex: "Pessoal", "FATEC", "PodOnly App Development"
  description?: string;
  color: string;               // Cor de destaque (hex ou token)
  iconName: string;            // Identificador do ícone Lucide
  contextBrainPrompt: string;  // Prompt do cérebro de contexto da área
  documents: AreaDocument[];   // Biblioteca de documentos e materiais de apoio compartilhados por Área
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  areaId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  
  // Fase 3: Quadro "Agora" (Foco em até 3 tarefas prioritárias)
  isPinnedNow: boolean;
  pinnedAt?: string;
  
  // Fase 2: Assistência da IA
  aiBrief?: AIBrief;
  isAiGenerating?: boolean;

  // Fase 3: Checklists & Ação Anti-Procrastinação
  subtasks: Subtask[];
  unstickAction?: string;
  isUnstickLoading?: boolean;

  // Fase 4: Onde parei
  pauseContext?: PauseContext;

  // Metadados & Fase 5
  tags: string[];
  desktopLaunchUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type TaskFilter = 'all' | 'active' | 'completed';

export type StickyNoteColor = 'yellow' | 'green' | 'purple' | 'rose' | 'blue';

export interface StickyNote {
  id: string;
  areaId: string;
  content: string;
  color: StickyNoteColor;
  x: number;
  y: number;
  zIndex: number;
  createdAt: string;
}

export type WorkspaceView = 'tasks' | 'notes';

export interface SyncQueueItem {
  id: string;
  table: 'areas' | 'tasks' | 'sticky_notes';
  action: 'upsert' | 'delete';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
  entityId: string;
  timestamp: number;
}
