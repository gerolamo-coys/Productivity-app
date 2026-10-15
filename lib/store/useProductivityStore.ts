import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import {
  Area,
  Task,
  TaskFilter,
  AIBrief,
  Subtask,
  AreaDocument,
  StickyNote,
  StickyNoteColor,
  WorkspaceView,
  EffortLevel,
  PauseContext,
  SyncQueueItem,
} from '@/types/productivity';

// ==========================================
// Conversores e Sincronização em Nuvem (Supabase)
// ==========================================

function areaToCloud(area: Area) {
  return {
    id: area.id,
    name: area.name,
    color: area.color,
    icon_name: area.iconName,
    context_brain_prompt: area.contextBrainPrompt,
    created_at: area.createdAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cloudToArea(row: any): Area {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    iconName: row.icon_name || row.iconName || 'Folder',
    contextBrainPrompt: row.context_brain_prompt || row.contextBrainPrompt || '',
    documents: Array.isArray(row.documents) ? row.documents : [],
    order: Number(row.order) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function taskToCloud(task: Task) {
  return {
    id: task.id,
    area_id: task.areaId,
    title: task.title,
    description: task.description || null,
    status: task.status,
    is_pinned_now: !!task.isPinnedNow,
    subtasks: task.subtasks || [],
    ai_brief: task.aiBrief || null,
    pause_context: task.pauseContext || null,
    desktop_launch_url: task.desktopLaunchUrl || null,
    tags: task.tags || [],
    created_at: task.createdAt,
    updated_at: task.updatedAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cloudToTask(row: any): Task {
  return {
    id: row.id,
    areaId: row.area_id || row.areaId,
    title: row.title,
    description: row.description || undefined,
    status: row.status || 'todo',
    isPinnedNow: !!row.is_pinned_now,
    pinnedAt: row.pinned_at || undefined,
    subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    aiBrief: row.ai_brief || undefined,
    pauseContext: row.pause_context || undefined,
    desktopLaunchUrl: row.desktop_launch_url || row.desktopLaunchUrl || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function noteToCloud(note: StickyNote) {
  return {
    id: note.id,
    area_id: note.areaId,
    content: note.content,
    color: note.color,
    x: note.x,
    y: note.y,
    z_index: note.zIndex,
    created_at: note.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cloudToNote(row: any): StickyNote {
  return {
    id: row.id,
    areaId: row.area_id || row.areaId,
    content: row.content || '',
    color: row.color || 'yellow',
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    zIndex: Number(row.z_index) || 1,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// ==========================================
// Gerenciador de Fila Offline e Sincronização em Nuvem (Supabase)
// ==========================================

function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>) {
  try {
    const store = useProductivityStore.getState();
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    const currentQueue = store.pendingSyncQueue || [];
    const filtered = currentQueue.filter(
      (q) => !(q.entityId === item.entityId && q.table === item.table)
    );
    useProductivityStore.setState({
      pendingSyncQueue: [...filtered, newItem],
    });
  } catch (e) {
    console.warn('[Offline Queue] Erro ao enfileirar ação offline:', e);
  }
}

function removeFromSyncQueue(entityId: string, table: string) {
  try {
    const store = useProductivityStore.getState();
    const currentQueue = store.pendingSyncQueue || [];
    useProductivityStore.setState({
      pendingSyncQueue: currentQueue.filter(
        (q) => !(q.entityId === entityId && q.table === table)
      ),
    });
  } catch (e) {
    console.warn('[Offline Queue] Erro ao remover da fila offline:', e);
  }
}

// Disparos assíncronos em segundo plano com tolerância a falhas offline
async function syncAreaToCloud(area: Area) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue({
      table: 'areas',
      action: 'upsert',
      entityId: area.id,
      payload: areaToCloud(area),
    });
    return;
  }

  try {
    const { error } = await supabase.from('areas').upsert(areaToCloud(area));
    if (error) {
      console.warn('[Cloud Sync] Falha ao sincronizar Área:', error.message);
      addToSyncQueue({
        table: 'areas',
        action: 'upsert',
        entityId: area.id,
        payload: areaToCloud(area),
      });
    } else {
      removeFromSyncQueue(area.id, 'areas');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede na Área:', err);
    addToSyncQueue({
      table: 'areas',
      action: 'upsert',
      entityId: area.id,
      payload: areaToCloud(area),
    });
  }
}

async function deleteAreaFromCloud(areaId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue({
      table: 'areas',
      action: 'delete',
      entityId: areaId,
    });
    return;
  }

  try {
    const { error } = await supabase.from('areas').delete().eq('id', areaId);
    if (error) {
      console.warn('[Cloud Sync] Falha ao excluir Área na nuvem:', error.message);
      addToSyncQueue({
        table: 'areas',
        action: 'delete',
        entityId: areaId,
      });
    } else {
      removeFromSyncQueue(areaId, 'areas');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede ao excluir Área:', err);
    addToSyncQueue({
      table: 'areas',
      action: 'delete',
      entityId: areaId,
    });
  }
}

async function syncTaskToCloud(task: Task) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue({
      table: 'tasks',
      action: 'upsert',
      entityId: task.id,
      payload: taskToCloud(task),
    });
    return;
  }

  try {
    const { error } = await supabase.from('tasks').upsert(taskToCloud(task));
    if (error) {
      console.warn('[Cloud Sync] Falha ao sincronizar Tarefa:', error.message);
      addToSyncQueue({
        table: 'tasks',
        action: 'upsert',
        entityId: task.id,
        payload: taskToCloud(task),
      });
    } else {
      removeFromSyncQueue(task.id, 'tasks');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede na Tarefa:', err);
    addToSyncQueue({
      table: 'tasks',
      action: 'upsert',
      entityId: task.id,
      payload: taskToCloud(task),
    });
  }
}

async function deleteTaskFromCloud(taskId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue({
      table: 'tasks',
      action: 'delete',
      entityId: taskId,
    });
    return;
  }

  try {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.warn('[Cloud Sync] Falha ao excluir Tarefa na nuvem:', error.message);
      addToSyncQueue({
        table: 'tasks',
        action: 'delete',
        entityId: taskId,
      });
    } else {
      removeFromSyncQueue(taskId, 'tasks');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede ao excluir Tarefa:', err);
    addToSyncQueue({
      table: 'tasks',
      action: 'delete',
      entityId: taskId,
    });
  }
}

async function syncStickyNoteToCloud(note: StickyNote) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue({
      table: 'sticky_notes',
      action: 'upsert',
      entityId: note.id,
      payload: noteToCloud(note),
    });
    return;
  }

  try {
    const { error } = await supabase.from('sticky_notes').upsert(noteToCloud(note));
    if (error) {
      console.warn('[Cloud Sync] Falha ao sincronizar Nota:', error.message);
      addToSyncQueue({
        table: 'sticky_notes',
        action: 'upsert',
        entityId: note.id,
        payload: noteToCloud(note),
      });
    } else {
      removeFromSyncQueue(note.id, 'sticky_notes');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede na Nota:', err);
    addToSyncQueue({
      table: 'sticky_notes',
      action: 'upsert',
      entityId: note.id,
      payload: noteToCloud(note),
    });
  }
}

async function deleteStickyNoteFromCloud(noteId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToSyncQueue({
      table: 'sticky_notes',
      action: 'delete',
      entityId: noteId,
    });
    return;
  }

  try {
    const { error } = await supabase.from('sticky_notes').delete().eq('id', noteId);
    if (error) {
      console.warn('[Cloud Sync] Falha ao excluir Nota na nuvem:', error.message);
      addToSyncQueue({
        table: 'sticky_notes',
        action: 'delete',
        entityId: noteId,
      });
    } else {
      removeFromSyncQueue(noteId, 'sticky_notes');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede ao excluir Nota:', err);
    addToSyncQueue({
      table: 'sticky_notes',
      action: 'delete',
      entityId: noteId,
    });
  }
}

async function clearStickyNotesFromCloud(areaId: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const notesInArea = useProductivityStore.getState().stickyNotes.filter((n) => n.areaId === areaId);
    notesInArea.forEach((n) => {
      addToSyncQueue({
        table: 'sticky_notes',
        action: 'delete',
        entityId: n.id,
      });
    });
    return;
  }

  try {
    const { error } = await supabase.from('sticky_notes').delete().eq('area_id', areaId);
    if (error) console.warn('[Cloud Sync] Falha ao limpar Notas na nuvem:', error.message);
  } catch (err) {
    console.warn('[Cloud Sync] Erro de rede ao limpar Notas:', err);
  }
}

// ==========================================
// Definição da Interface do Store Zustand
// ==========================================

interface ProductivityState {
  // Estado de hidratação para segurança do SSR no Next.js
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Status de Conexão e Sincronização em Nuvem (Supabase & Offline)
  isOnline: boolean;
  isCloudConnected: boolean;
  isCloudSyncing: boolean;
  pendingSyncQueue: SyncQueueItem[];
  fetchCloudData: () => Promise<void>;
  flushPendingSyncQueue: () => Promise<void>;
  initCloudSync: () => () => void;

  areas: Area[];
  tasks: Task[];
  stickyNotes: StickyNote[];
  selectedAreaId: string | null; // null = "Todas as Áreas"
  workspaceView: WorkspaceView; // 'tasks' | 'notes'
  setWorkspaceView: (view: WorkspaceView) => void;

  filter: TaskFilter;
  searchQuery: string;
  isAreaModalOpen: boolean;
  areaToEdit: Area | null;
  isMobileSidebarOpen: boolean;

  // Modal de Materiais de Apoio da Área
  isDocumentsModalOpen: boolean;
  activeDocumentsAreaId: string | null;

  // Ações
  setSelectedAreaId: (id: string | null) => void;
  setFilter: (filter: TaskFilter) => void;
  setSearchQuery: (query: string) => void;
  setIsAreaModalOpen: (open: boolean) => void;
  setAreaToEdit: (area: Area | null) => void;
  openAreaModal: (area?: Area | null) => void;
  closeAreaModal: () => void;
  openDocumentsModal: (areaId?: string | null) => void;
  closeDocumentsModal: () => void;
  setIsMobileSidebarOpen: (open: boolean) => void;

  // CRUD de Áreas
  addArea: (area: Omit<Area, 'id' | 'order' | 'createdAt' | 'updatedAt' | 'documents'>) => Area;
  updateArea: (id: string, updates: Partial<Omit<Area, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteArea: (id: string) => void;

  // Gerenciamento de Documentos de Apoio por Área
  addDocumentToArea: (areaId: string, doc: AreaDocument) => void;
  toggleDocumentActive: (areaId: string, docId: string) => void;
  removeDocumentFromArea: (areaId: string, docId: string) => void;

  // Mural de Notas Adesivas (Sticky Notes) por Área
  addStickyNote: (data: {
    areaId: string;
    content?: string;
    color?: StickyNoteColor;
    x?: number;
    y?: number;
  }) => StickyNote;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;
  bringStickyNoteToFront: (id: string) => void;
  clearStickyNotesInArea: (areaId: string) => void;
  mergeNotesIntoTask: (data: {
    areaId: string;
    noteIds: string[];
    title: string;
    description?: string;
    subtasks: string[];
    estimatedEffort?: EffortLevel;
    keyTips?: string[];
  }) => Task;

  // Notificações Toast sutis
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;

  // CRUD de Tarefas
  addTask: (data: { areaId: string; title: string; description?: string }) => Task;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;

  // Fase 2 & 3: Ações do Motor de IA & Interatividade
  generateTaskBrief: (taskId: string) => Promise<void>;
  convertAiStepsToSubtasks: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  togglePinNow: (taskId: string) => void;
  setUnstickAction: (taskId: string, actionText: string) => void;
  requestUnstickAction: (taskId: string) => Promise<void>;

  // Fase 4: Onde Parei (Pause Context)
  setTaskPauseContext: (taskId: string, note: string) => void;
  clearTaskPauseContext: (taskId: string) => void;

  // Fase 5: Power Input (Voz/Imagem) & Workspace Launcher
  isVoiceDumpOpen: boolean;
  setIsVoiceDumpOpen: (open: boolean) => void;
  addTasksFromVoiceDump: (routedTasks: Array<{
    title: string;
    description?: string;
    areaId: string;
    estimatedEffort?: EffortLevel;
  }>) => Task[];
  addTaskFromImage: (data: {
    areaId: string;
    title: string;
    description?: string;
    suggestedSteps?: string[];
    estimatedEffort?: EffortLevel;
    keyTips?: string[];
  }) => Task;
  setTaskDesktopLaunchUrl: (taskId: string, url: string) => void;
}

const DEFAULT_AREAS: Area[] = [
  {
    id: 'area-personal',
    name: 'Pessoal',
    description: 'Academia, hábitos, finanças e logística diária',
    color: '#10b981', // Emerald
    iconName: 'User',
    contextBrainPrompt:
      'Tarefas da vida pessoal, rotina de academia/treino, compras e logística diária. Manter conselhos práticos, rápidos e sem atrito.',
    documents: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'area-fatec',
    name: 'FATEC',
    description: 'Disciplinas de TI, programação, provas e projetos',
    color: '#6366f1', // Indigo
    iconName: 'GraduationCap',
    contextBrainPrompt:
      'Disciplinas do curso de TI / Análise e Desenvolvimento de Sistemas na Fatec. Matérias principais: Matemática Discreta (lógica proposicional, grafos), Álgebra Linear (matrizes, determinantes), Programação em Python, Git e Desenvolvimento Web (HTML/CSS). Fornecer checklists de estudo, fórmulas-chave ou passo a passo para resolução de problemas.',
    documents: [
      {
        id: 'doc-fatec-ementa',
        fileName: 'Ementa_Algebra_Linear_FATEC.md',
        fileType: 'text/markdown',
        uploadedAt: new Date().toISOString(),
        isActive: true,
        contentSnippet: `# Ementa de Álgebra Linear - Fatec
Unidade 1: Matrizes e Operações Elementares
- Matrizes quadradas, identidade, nula e transposta.
- Multiplicação de matrizes: condição de existência (colunas de A = linhas de B). Propriedade não-comutativa.

Unidade 2: Determinantes
- Ordem 2 e 3: Regra de Sarrus.
- Teorema de Laplace (Expansão por cofatores): det(A) = soma de a_ij * C_ij.`,
      },
    ],
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'area-podonly',
    name: 'PodOnly App Development',
    description: 'Sistema web para podólogos (agendamento, prontuário, financeiro)',
    color: '#0ea5e9', // Sky/Cyan
    iconName: 'Sparkles',
    contextBrainPrompt:
      'Software SaaS para podólogos independentes e clínicas de podologia. Stack: Next.js App Router, Tailwind CSS, TypeScript, Supabase e Lucide Icons. Módulos centrais: Agendamento de consultas, Prontuário Podológico eletrônico (registro de lesões, pés diabéticos, procedimentos de calosidades/unhas encravadas), Financeiro e Gestão de Pacientes. Focar em código limpo, componentização React e UX acessível para profissionais em atendimento.',
    documents: [
      {
        id: 'doc-podonly-spec',
        fileName: 'Especificacao_Prontuario_PodOnly.md',
        fileType: 'text/markdown',
        uploadedAt: new Date().toISOString(),
        isActive: true,
        contentSnippet: `# Especificação do Prontuário Podológico - PodOnly
Campos obrigatórios de Anamnese:
1. Histórico de Diabetes (Tipo 1, Tipo 2, Glicemia controlada).
2. Queixa principal (onicocriptose/unha encravada, calosidade plantar, verruga).
3. Avaliação de sensibilidade nos pés (Teste com monofilamento de Semmes-Weinstein 10g).
4. Procedimento realizado e curativo aplicado.`,
      },
    ],
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-fatec-1',
    areaId: 'area-fatec',
    title: 'Estudar Teorema de Laplace e Regra de Chió para prova de Álgebra Linear',
    description: 'Fazer 5 exercícios práticos de determinantes de ordem 4x4',
    status: 'todo',
    isPinnedNow: true,
    pinnedAt: new Date().toISOString(),
    subtasks: [
      {
        id: 'st-1',
        title: 'Escolher a linha ou coluna com o maior número de zeros para Laplace',
        isCompleted: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'st-2',
        title: 'Calcular os cofatores C_ij correspondentes',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
    ],
    aiBrief: {
      summary:
        'O Teorema de Laplace expande determinantes através dos cofatores de qualquer linha ou coluna; escolha sempre a fila com mais zeros.',
      suggestedSteps: [
        'Identifique e selecione a linha ou coluna da matriz 4x4 que possui a maior quantidade de zeros para minimizar os cálculos.',
        'Aplique a fórmula do cofator: C_ij = (-1)^(i+j) * det(M_ij), onde M_ij é a submatriz 3x3 obtida eliminando a linha i e coluna j.',
        'Para cada determinante 3x3 restante, aplique a Regra de Sarrus.',
        'Some os produtos dos elementos pelos seus respectivos cofatores para obter o determinante final.',
      ],
      estimatedEffort: '30min',
      keyTips: [
        'Dica de ouro: Se nenhum elemento for 0, use operações elementares de linha (Teorema de Jacobi) para zerar elementos antes de aplicar Laplace.',
      ],
      groundedDocuments: ['Ementa_Algebra_Linear_FATEC.md'],
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash (Grounded)',
    },
    tags: ['álgebra', 'fatec', 'prova'],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-podonly-1',
    areaId: 'area-podonly',
    title: 'Criar componente de mapa de lesões nos pés para a ficha de anamnese',
    description: 'Permitir que o podólogo marque pontos visuais no desenho da planta do pé',
    status: 'in_progress',
    isPinnedNow: true,
    pinnedAt: new Date().toISOString(),
    subtasks: [
      {
        id: 'st-pod-1',
        title: 'Estruturar o componente SVG interativo da planta do pé',
        isCompleted: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'st-pod-2',
        title: 'Adicionar estado de clique para gravar coordenadas x, y da lesão',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'st-pod-3',
        title: 'Conectar com campos de paciente diabético conforme especificação',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
    ],
    aiBrief: {
      summary:
        'Desenvolva um componente React com SVG interativo permitindo salvar coordenadas (x, y) de lesões com marcadores visuais coloridos.',
      suggestedSteps: [
        'Crie o componente FeetLesionMap.tsx com uma imagem vetorial SVG de pés (vista plantar e dorsal).',
        'Capture eventos onClick no SVG calculando coordenadas percentuais relativas (offsetX / width, offsetY / height) para responsividade.',
        'Renderize pins pulsantes sobre as coordenadas salvas com cores por severidade (ex: vermelho para úlceras, amarelo para calos).',
        'Integre o estado das lesões ao formulário de anamnese do paciente no PodOnly.',
      ],
      estimatedEffort: '1h+',
      keyTips: [
        'Armazene as coordenadas em porcentagem (0-100%) em vez de pixels fixos para manter a precisão em telas de celular ou tablet.',
      ],
      groundedDocuments: ['Especificacao_Prontuario_PodOnly.md'],
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash (Grounded)',
    },
    tags: ['frontend', 'react', 'prontuário'],
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-personal-1',
    areaId: 'area-personal',
    title: 'Comprar whey protein da academia e agendar revisão do carro',
    description: 'Comparar preços pela internet e ligar para a oficina mecânica',
    status: 'completed',
    isPinnedNow: false,
    subtasks: [],
    tags: ['logística', 'academia'],
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
];

const DEFAULT_STICKY_NOTES: StickyNote[] = [
  {
    id: 'note-fatec-1',
    areaId: 'area-fatec',
    content: '📌 Regra de Sarrus (3x3):\nDiag. principal (+) menos diag. secundária (-).\nSe det(A) == 0, a matriz NÃO tem inversa!',
    color: 'yellow',
    x: 30,
    y: 30,
    zIndex: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-fatec-2',
    areaId: 'area-fatec',
    content: '💡 Dica de Álgebra Linear:\nSempre procure uma linha ou coluna com múltiplos zeros para expandir por Laplace. Isso reduz os cálculos pela metade!',
    color: 'blue',
    x: 310,
    y: 40,
    zIndex: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-podonly-1',
    areaId: 'area-podonly',
    content: '🎨 Paleta dos Marcadores Clínicos:\n🔴 Diabético: #ef4444 (Red-500)\n🟠 Neuropatia: #f59e0b (Amber-500)\n🟢 Sem Risco: #10b981 (Emerald-500)',
    color: 'green',
    x: 40,
    y: 40,
    zIndex: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-podonly-2',
    areaId: 'area-podonly',
    content: '⚡ Requisito UX PodOnly:\nO fluxo de anamnese deve permitir navegação 100% rápida pelo teclado (Tab avança sem precisar do mouse).',
    color: 'purple',
    x: 320,
    y: 50,
    zIndex: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-personal-1',
    areaId: 'area-personal',
    content: '🛒 Lembretes Rápidos:\n- Creatina monohidratada\n- Pasta de amendoim integral\n- Ligar para agendar revisão mecânica do carro',
    color: 'rose',
    x: 50,
    y: 40,
    zIndex: 1,
    createdAt: new Date().toISOString(),
  },
];

export const useProductivityStore = create<ProductivityState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isCloudConnected: false,
      isCloudSyncing: false,
      pendingSyncQueue: [],

      areas: DEFAULT_AREAS,
      tasks: DEFAULT_TASKS,
      stickyNotes: DEFAULT_STICKY_NOTES,
      selectedAreaId: null,
      workspaceView: 'tasks',
      setWorkspaceView: (view) => set({ workspaceView: view }),

      filter: 'all',
      searchQuery: '',
      isAreaModalOpen: false,
      areaToEdit: null,
      isMobileSidebarOpen: false,

      isDocumentsModalOpen: false,
      activeDocumentsAreaId: null,

      toastMessage: null,
      showToast: (msg: string) => {
        set({ toastMessage: msg });
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            if (get().toastMessage === msg) {
              set({ toastMessage: null });
            }
          }, 4000);
        }
      },
      hideToast: () => set({ toastMessage: null }),

      setSelectedAreaId: (id) => set({ selectedAreaId: id }),
      setFilter: (filter) => set({ filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setIsAreaModalOpen: (open) => set({ isAreaModalOpen: open }),
      setAreaToEdit: (area) => set({ areaToEdit: area }),
      setIsMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      isVoiceDumpOpen: false,
      setIsVoiceDumpOpen: (open) => set({ isVoiceDumpOpen: open }),

      openAreaModal: (area = null) => {
        set({ areaToEdit: area, isAreaModalOpen: true });
      },
      closeAreaModal: () => {
        set({ areaToEdit: null, isAreaModalOpen: false });
      },

      openDocumentsModal: (areaId = null) => {
        set({
          activeDocumentsAreaId: areaId || get().selectedAreaId || get().areas[0]?.id || null,
          isDocumentsModalOpen: true,
        });
      },
      closeDocumentsModal: () => {
        set({ isDocumentsModalOpen: false, activeDocumentsAreaId: null });
      },

      // ==========================================
      // Sincronização Inteligente e Fila Offline (Supabase)
      // ==========================================

      flushPendingSyncQueue: async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        const queue = get().pendingSyncQueue;
        if (!queue || queue.length === 0) return;

        set({ isCloudSyncing: true });
        const remainingQueue: SyncQueueItem[] = [];

        for (const item of queue) {
          try {
            if (item.action === 'upsert' && item.payload) {
              const { error } = await supabase.from(item.table).upsert(item.payload);
              if (error) {
                console.warn(`[Offline Queue] Falha ao sincronizar ${item.table}:`, error.message);
                remainingQueue.push(item);
              }
            } else if (item.action === 'delete') {
              const { error } = await supabase.from(item.table).delete().eq('id', item.entityId);
              if (error) {
                console.warn(`[Offline Queue] Falha ao deletar ${item.table}:`, error.message);
                remainingQueue.push(item);
              }
            }
          } catch (err) {
            console.warn(`[Offline Queue] Erro de rede em ${item.table}:`, err);
            remainingQueue.push(item);
          }
        }

        set({
          pendingSyncQueue: remainingQueue,
          isCloudSyncing: false,
        });

        if (remainingQueue.length === 0 && queue.length > 0) {
          get().showToast('✅ Todas as alterações offline foram sincronizadas com a nuvem!');
        }
      },

      fetchCloudData: async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ isCloudConnected: false, isCloudSyncing: false });
          return;
        }

        set({ isCloudSyncing: true });
        try {
          // 1. Tenta descarregar primeiro qualquer alteração offline pendente
          await get().flushPendingSyncQueue();

          const [areasRes, tasksRes, notesRes] = await Promise.all([
            supabase.from('areas').select('*').order('created_at', { ascending: true }),
            supabase.from('tasks').select('*').order('created_at', { ascending: false }),
            supabase.from('sticky_notes').select('*').order('created_at', { ascending: true }),
          ]);

          if (areasRes.error) {
            console.warn('[Cloud Sync] Erro ao buscar Áreas:', areasRes.error.message);
          }
          if (tasksRes.error) {
            console.warn('[Cloud Sync] Erro ao buscar Tarefas:', tasksRes.error.message);
          }
          if (notesRes.error) {
            console.warn('[Cloud Sync] Erro ao buscar Notas:', notesRes.error.message);
          }

          const cloudAreas = areasRes.data;
          const cloudTasks = tasksRes.data;
          const cloudNotes = notesRes.data;

          const currentQueue = get().pendingSyncQueue || [];
          const pendingTaskIds = new Set(
            currentQueue.filter((q) => q.table === 'tasks').map((q) => q.entityId)
          );
          const pendingAreaIds = new Set(
            currentQueue.filter((q) => q.table === 'areas').map((q) => q.entityId)
          );
          const pendingNoteIds = new Set(
            currentQueue.filter((q) => q.table === 'sticky_notes').map((q) => q.entityId)
          );

          // Se a nuvem estiver vazia, tenta semear com as áreas padrão
          if (Array.isArray(cloudAreas) && cloudAreas.length === 0) {
            const initialAreas = get().areas.length > 0 ? get().areas : DEFAULT_AREAS;
            const seedPayload = initialAreas.map(areaToCloud);
            const { error: seedErr } = await supabase.from('areas').upsert(seedPayload);
            if (seedErr) {
              console.warn('[Cloud Sync] Aviso ao semear áreas no Supabase (verifique RLS):', seedErr.message);
            }
          } else if (Array.isArray(cloudAreas) && cloudAreas.length > 0) {
            // Preserva documentos locais caso a tabela de áreas do Supabase não possua a coluna de documentos
            const localAreas = get().areas;
            const mappedAreas: Area[] = cloudAreas.map((row) => {
              const base = cloudToArea(row);
              const localMatch = localAreas.find((a) => a.id === base.id);
              if (localMatch) {
                if (localMatch.documents && localMatch.documents.length > 0) {
                  base.documents = localMatch.documents;
                }
                if (pendingAreaIds.has(base.id)) {
                  return localMatch;
                }
              }
              return base;
            });

            const localOnlyAreas = localAreas.filter(
              (la) => !mappedAreas.some((ma) => ma.id === la.id) && pendingAreaIds.has(la.id)
            );

            set({ areas: [...mappedAreas, ...localOnlyAreas] });
          }

          if (Array.isArray(cloudTasks)) {
            const localTasks = get().tasks;
            const remoteTasks = cloudTasks.map(cloudToTask);

            // Mesclagem Inteligente (Smart Merge):
            const mergedTasks = remoteTasks.map((rt) => {
              const localMatch = localTasks.find((lt) => lt.id === rt.id);
              if (!localMatch) return rt;
              // Se há pendência de sincronização local desta tarefa, respeita a versão local
              if (pendingTaskIds.has(rt.id)) return localMatch;
              // Se a versão local foi modificada mais recentemente que a nuvem, mantém a local
              const localTime = new Date(localMatch.updatedAt || localMatch.createdAt).getTime();
              const remoteTime = new Date(rt.updatedAt || rt.createdAt).getTime();
              return localTime > remoteTime ? localMatch : rt;
            });

            // Preserva tarefas que só existem localmente (criadas offline)
            const localOnlyTasks = localTasks.filter(
              (lt) => !mergedTasks.some((mt) => mt.id === lt.id) && pendingTaskIds.has(lt.id)
            );

            // Filtra tarefas marcadas para exclusão pendente
            const pendingDeletions = new Set(
              currentQueue.filter((q) => q.table === 'tasks' && q.action === 'delete').map((q) => q.entityId)
            );

            const finalTasks = [...localOnlyTasks, ...mergedTasks].filter(
              (t) => !pendingDeletions.has(t.id)
            );

            set({ tasks: finalTasks });
          }

          if (Array.isArray(cloudNotes)) {
            const localNotes = get().stickyNotes;
            const remoteNotes = cloudNotes.map(cloudToNote);

            const mergedNotes = remoteNotes.map((rn) => {
              const localMatch = localNotes.find((ln) => ln.id === rn.id);
              if (localMatch && pendingNoteIds.has(rn.id)) {
                return localMatch;
              }
              return rn;
            });

            const localOnlyNotes = localNotes.filter(
              (ln) => !mergedNotes.some((mn) => mn.id === ln.id) && pendingNoteIds.has(ln.id)
            );

            const pendingNoteDeletions = new Set(
              currentQueue.filter((q) => q.table === 'sticky_notes' && q.action === 'delete').map((q) => q.entityId)
            );

            set({
              stickyNotes: [...localOnlyNotes, ...mergedNotes].filter(
                (n) => !pendingNoteDeletions.has(n.id)
              ),
            });
          }

          set({ isCloudConnected: true });
        } catch (err) {
          console.warn('[Cloud Sync] Erro ao carregar dados da nuvem:', err);
          set({ isCloudConnected: false });
        } finally {
          set({ isCloudSyncing: false });
        }
      },

      initCloudSync: () => {
        // Atualiza estado de conexão inicial
        if (typeof navigator !== 'undefined') {
          set({ isOnline: navigator.onLine });
        }

        // Carrega dados iniciais da nuvem se online
        if (typeof navigator === 'undefined' || navigator.onLine) {
          get().fetchCloudData();
        }

        // Listeners de Conexão de Rede do Navegador
        const handleOnline = () => {
          set({ isOnline: true });
          get().showToast('🌐 Conexão restabelecida! Sincronizando com a nuvem...');
          get().flushPendingSyncQueue().then(() => {
            get().fetchCloudData();
          });
        };

        const handleOffline = () => {
          set({ isOnline: false, isCloudConnected: false });
          get().showToast('📡 Modo offline ativo. Todas as alterações serão salvas localmente.');
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
        }

        // Inscreve-se nos canais de Realtime para atualizações imediatas entre Desktop e Mobile
        const channel = supabase
          .channel('areatask-realtime-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'areas' },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updatedArea = cloudToArea(payload.new);
                set((state) => {
                  const exists = state.areas.some((a) => a.id === updatedArea.id);
                  if (exists) {
                    return {
                      areas: state.areas.map((a) =>
                        a.id === updatedArea.id ? { ...a, ...updatedArea } : a
                      ),
                    };
                  }
                  return { areas: [...state.areas, updatedArea] };
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id?: string })?.id;
                if (deletedId) {
                  set((state) => ({
                    areas: state.areas.filter((a) => a.id !== deletedId),
                  }));
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updatedTask = cloudToTask(payload.new);
                set((state) => {
                  const exists = state.tasks.some((t) => t.id === updatedTask.id);
                  if (exists) {
                    return {
                      tasks: state.tasks.map((t) =>
                        t.id === updatedTask.id ? { ...t, ...updatedTask } : t
                      ),
                    };
                  }
                  return { tasks: [updatedTask, ...state.tasks] };
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id?: string })?.id;
                if (deletedId) {
                  set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== deletedId),
                  }));
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sticky_notes' },
            (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updatedNote = cloudToNote(payload.new);
                set((state) => {
                  const exists = state.stickyNotes.some((n) => n.id === updatedNote.id);
                  if (exists) {
                    return {
                      stickyNotes: state.stickyNotes.map((n) =>
                        n.id === updatedNote.id ? { ...n, ...updatedNote } : n
                      ),
                    };
                  }
                  return { stickyNotes: [...state.stickyNotes, updatedNote] };
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id?: string })?.id;
                if (deletedId) {
                  set((state) => ({
                    stickyNotes: state.stickyNotes.filter((n) => n.id !== deletedId),
                  }));
                }
              }
            }
          )
          .subscribe();

        return () => {
          if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          }
          supabase.removeChannel(channel);
        };
      },

      // ==========================================
      // Ações de Áreas
      // ==========================================

      addArea: (areaData) => {
        const newArea: Area = {
          ...areaData,
          id: `area-${Date.now()}`,
          documents: [],
          order: get().areas.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          areas: [...state.areas, newArea],
          selectedAreaId: newArea.id,
        }));

        syncAreaToCloud(newArea);
        return newArea;
      },

      updateArea: (id, updates) => {
        set((state) => ({
          areas: state.areas.map((area) =>
            area.id === id
              ? {
                  ...area,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : area
          ),
        }));

        const updated = get().areas.find((a) => a.id === id);
        if (updated) syncAreaToCloud(updated);
      },

      deleteArea: (id) => {
        set((state) => ({
          areas: state.areas.filter((area) => area.id !== id),
          tasks: state.tasks.filter((task) => task.areaId !== id),
          selectedAreaId: state.selectedAreaId === id ? null : state.selectedAreaId,
        }));

        deleteAreaFromCloud(id);
      },

      addDocumentToArea: (areaId, doc) => {
        set((state) => ({
          areas: state.areas.map((area) =>
            area.id === areaId
              ? {
                  ...area,
                  documents: [doc, ...(area.documents || [])],
                  updatedAt: new Date().toISOString(),
                }
              : area
          ),
        }));
      },

      toggleDocumentActive: (areaId, docId) => {
        set((state) => ({
          areas: state.areas.map((area) =>
            area.id === areaId
              ? {
                  ...area,
                  documents: (area.documents || []).map((doc) =>
                    doc.id === docId ? { ...doc, isActive: !doc.isActive } : doc
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : area
          ),
        }));
      },

      removeDocumentFromArea: (areaId, docId) => {
        set((state) => ({
          areas: state.areas.map((area) =>
            area.id === areaId
              ? {
                  ...area,
                  documents: (area.documents || []).filter((doc) => doc.id !== docId),
                  updatedAt: new Date().toISOString(),
                }
              : area
          ),
        }));
      },

      // ==========================================
      // Ações de Tarefas
      // ==========================================

      addTask: ({ areaId, title, description }) => {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          areaId,
          title: title.trim(),
          description: description?.trim() || undefined,
          status: 'todo',
          isPinnedNow: false,
          isAiGenerating: true,
          subtasks: [],
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        syncTaskToCloud(newTask);

        // Dispara geração automática em background
        get().generateTaskBrief(newTask.id);

        return newTask;
      },

      generateTaskBrief: async (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        const area = get().areas.find((a) => a.id === task.areaId);
        const areaName = area ? area.name : 'Geral';
        const contextBrainPrompt = area ? area.contextBrainPrompt : '';

        // Extrai apenas os documentos ativos da Área
        const activeDocs = (area?.documents || [])
          .filter((d) => d.isActive)
          .map((d) => ({
            fileName: d.fileName,
            contentSnippet: d.contentSnippet,
          }));

        // Extrai as notas adesivas do Mural desta Área
        const areaNotes = (get().stickyNotes || [])
          .filter((n) => n.areaId === task.areaId && n.content.trim())
          .map((n) => n.content.trim());

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, isAiGenerating: true } : t
          ),
        }));

        try {
          const res = await fetch('/api/ai/helper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskTitle: task.title,
              taskDescription: task.description,
              areaName,
              contextBrainPrompt,
              documents: activeDocs,
              notes: areaNotes,
              pauseContext: task.pauseContext,
            }),
          });

          if (!res.ok) {
            throw new Error(`Falha ao gerar guia de IA: ${res.statusText}`);
          }

          const brief = (await res.json()) as AIBrief;

          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    aiBrief: brief,
                    isAiGenerating: false,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
          }));

          const updated = get().tasks.find((t) => t.id === taskId);
          if (updated) syncTaskToCloud(updated);
        } catch (error) {
          console.error('Falha em generateTaskBrief:', error);
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId ? { ...t, isAiGenerating: false } : t
            ),
          }));
        }
      },

      convertAiStepsToSubtasks: (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task || !task.aiBrief || !task.aiBrief.suggestedSteps) return;

        const generateId = (idx: number) => {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
          }
          return `sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
        };

        const newSubtasks: Subtask[] = task.aiBrief.suggestedSteps.map((step, idx) => ({
          id: generateId(idx),
          title: step,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        }));

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: [...(t.subtasks || []), ...newSubtasks],
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
      },

      toggleSubtask: (taskId: string, subtaskId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const updatedSubtasks = (task.subtasks || []).map((st) =>
              st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
            );
            return {
              ...task,
              subtasks: updatedSubtasks,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
      },

      addSubtask: (taskId: string, title: string) => {
        if (!title.trim()) return;

        const newSubtask: Subtask = {
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          isCompleted: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: [...(task.subtasks || []), newSubtask],
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
      },

      deleteSubtask: (taskId: string, subtaskId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks || []).filter((st) => st.id !== subtaskId),
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
      },

      togglePinNow: (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        if (task.isPinnedNow) {
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    isPinnedNow: false,
                    pinnedAt: undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
          }));
        } else {
          const currentPinnedCount = get().tasks.filter(
            (t) => t.isPinnedNow && t.status !== 'completed'
          ).length;

          if (currentPinnedCount >= 3) {
            get().showToast(
              'Limite de 3 tarefas em foco atingido. Desafixe uma para adicionar outra.'
            );
            return;
          }

          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    isPinnedNow: true,
                    pinnedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
          }));
        }

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
      },

      setUnstickAction: (taskId: string, actionText: string) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  unstickAction: actionText,
                  isUnstickLoading: false,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
      },

      requestUnstickAction: async (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        const area = get().areas.find((a) => a.id === task.areaId);
        const areaName = area ? area.name : 'Geral';
        const contextBrainPrompt = area ? area.contextBrainPrompt : '';

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, isUnstickLoading: true } : t
          ),
        }));

        const areaNotes = (get().stickyNotes || [])
          .filter((n) => n.areaId === task.areaId && n.content.trim())
          .map((n) => n.content.trim());

        try {
          const res = await fetch('/api/ai/unstick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskTitle: task.title,
              areaName,
              contextBrainPrompt,
              notes: areaNotes,
            }),
          });

          if (!res.ok) {
            throw new Error(`Falha ao obter micro-ação: ${res.statusText}`);
          }

          const data = await res.json();
          if (data && data.microAction) {
            get().setUnstickAction(taskId, data.microAction);
          } else {
            get().setUnstickAction(
              taskId,
              'Abra o editor e escreva a primeira linha de código ou anote a primeira fórmula no papel.'
            );
          }
        } catch (error) {
          console.error('Falha em requestUnstickAction:', error);
          get().setUnstickAction(
            taskId,
            'Abra os arquivos da tarefa e leia os primeiros 3 parágrafos ou crie o primeiro arquivo do projeto.'
          );
        }
      },

      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            const willBeCompleted = task.status !== 'completed';
            return {
              ...task,
              status: willBeCompleted ? 'completed' : 'todo',
              completedAt: willBeCompleted ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        const updated = get().tasks.find((t) => t.id === id);
        if (updated) syncTaskToCloud(updated);
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));

        deleteTaskFromCloud(id);
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : task
          ),
        }));

        const updated = get().tasks.find((t) => t.id === id);
        if (updated) syncTaskToCloud(updated);
      },

      // ==========================================
      // Fase 4: Onde Parei (Pause Context)
      // ==========================================

      setTaskPauseContext: (taskId: string, note: string) => {
        const trimmed = note.trim();
        const pauseObj: PauseContext | undefined = trimmed
          ? {
              note: trimmed,
              updatedAt: new Date().toISOString(),
            }
          : undefined;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: trimmed ? 'paused' : t.status === 'paused' ? 'todo' : t.status,
                  pauseContext: pauseObj,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);

        get().showToast(trimmed ? '⏸ Ponto de parada registrado!' : 'Ponto de pausa removido.');
      },

      clearTaskPauseContext: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: t.status === 'paused' ? 'todo' : t.status,
                  pauseContext: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
        get().showToast('▶ Tarefa retomada.');
      },

      // ==========================================
      // Fase 5: Power Input (Voz/Imagem) & Workspace Launcher
      // ==========================================

      addTasksFromVoiceDump: (routedTasks) => {
        if (!routedTasks.length) return [];

        const newTasks: Task[] = routedTasks.map((rt, idx) => {
          const newTask: Task = {
            id: `task-voice-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            areaId: rt.areaId,
            title: rt.title.trim(),
            description: rt.description?.trim() || undefined,
            status: 'todo',
            isPinnedNow: false,
            isAiGenerating: true,
            subtasks: [],
            tags: ['captura-voz'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return newTask;
        });

        set((state) => ({
          tasks: [...newTasks, ...state.tasks],
        }));

        // Sincroniza cada uma com o Supabase e dispara o AI helper em background
        newTasks.forEach((t) => {
          syncTaskToCloud(t);
          get().generateTaskBrief(t.id);
        });

        get().showToast(
          `🎙️ ${newTasks.length} ${
            newTasks.length === 1 ? 'tarefa criada' : 'tarefas criadas'
          } e organizadas por Área!`
        );

        return newTasks;
      },

      addTaskFromImage: ({
        areaId,
        title,
        description,
        suggestedSteps = [],
        estimatedEffort = '30min',
        keyTips = [],
      }) => {
        const generateSubId = (idx: number) => {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
          }
          return `sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
        };

        const newTask: Task = {
          id: `task-img-${Date.now()}`,
          areaId,
          title: title.trim(),
          description: description?.trim() || undefined,
          status: 'todo',
          isPinnedNow: false,
          isAiGenerating: false,
          subtasks: suggestedSteps.map((step, idx) => ({
            id: generateSubId(idx),
            title: step,
            isCompleted: false,
            createdAt: new Date().toISOString(),
          })),
          aiBrief: {
            summary: description?.trim() || title.trim(),
            suggestedSteps,
            estimatedEffort,
            keyTips,
            generatedAt: new Date().toISOString(),
            modelUsed: 'gemini-2.5-flash (Multimodal)',
          },
          tags: ['captura-imagem'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        syncTaskToCloud(newTask);
        get().showToast(`📸 Tarefa "${newTask.title}" criada a partir da imagem!`);
        return newTask;
      },

      setTaskDesktopLaunchUrl: (taskId: string, url: string) => {
        const trimmed = url.trim();
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  desktopLaunchUrl: trimmed || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        const updated = get().tasks.find((t) => t.id === taskId);
        if (updated) syncTaskToCloud(updated);
        get().showToast(
          trimmed
            ? '🚀 Atalho de workspace configurado!'
            : 'Atalho de workspace removido.'
        );
      },

      // ==========================================
      // Ações do Mural de Notas Adesivas
      // ==========================================

      addStickyNote: ({ areaId, content = '', color = 'yellow', x = 40, y = 40 }) => {
        const maxZ = get().stickyNotes.reduce((max, n) => Math.max(max, n.zIndex || 0), 0);
        const newNote: StickyNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          areaId,
          content,
          color,
          x: x + Math.floor(Math.random() * 20) - 10,
          y: y + Math.floor(Math.random() * 20) - 10,
          zIndex: maxZ + 1,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          stickyNotes: [...state.stickyNotes, newNote],
        }));

        syncStickyNoteToCloud(newNote);
        return newNote;
      },

      updateStickyNote: (id, updates) => {
        set((state) => ({
          stickyNotes: state.stickyNotes.map((note) =>
            note.id === id ? { ...note, ...updates } : note
          ),
        }));

        const updated = get().stickyNotes.find((n) => n.id === id);
        if (updated) syncStickyNoteToCloud(updated);
      },

      deleteStickyNote: (id) => {
        set((state) => ({
          stickyNotes: state.stickyNotes.filter((note) => note.id !== id),
        }));

        deleteStickyNoteFromCloud(id);
      },

      bringStickyNoteToFront: (id) => {
        const maxZ = get().stickyNotes.reduce((max, n) => Math.max(max, n.zIndex || 0), 0);
        set((state) => ({
          stickyNotes: state.stickyNotes.map((note) =>
            note.id === id ? { ...note, zIndex: maxZ + 1 } : note
          ),
        }));
      },

      clearStickyNotesInArea: (areaId) => {
        set((state) => ({
          stickyNotes: state.stickyNotes.filter((note) => note.areaId !== areaId),
        }));

        clearStickyNotesFromCloud(areaId);
      },

      mergeNotesIntoTask: ({
        areaId,
        noteIds,
        title,
        description,
        subtasks,
        estimatedEffort = '30min',
        keyTips = [],
      }) => {
        const generateSubId = (idx: number) => {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
          }
          return `sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
        };

        const newTask: Task = {
          id: `task-${Date.now()}`,
          areaId,
          title: title.trim(),
          description: description?.trim() || undefined,
          status: 'todo',
          isPinnedNow: false,
          isAiGenerating: false,
          subtasks: subtasks.map((stTitle, idx) => ({
            id: generateSubId(idx),
            title: stTitle,
            isCompleted: false,
            createdAt: new Date().toISOString(),
          })),
          aiBrief: {
            summary: description?.trim() || title.trim(),
            suggestedSteps: subtasks,
            estimatedEffort,
            keyTips,
            generatedAt: new Date().toISOString(),
            modelUsed: 'gemini-3.8-flash (Síntese)',
          },
          tags: ['síntese-mural'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
          stickyNotes: state.stickyNotes.filter((n) => !noteIds.includes(n.id)),
          workspaceView: 'tasks',
        }));

        syncTaskToCloud(newTask);
        noteIds.forEach((nId) => deleteStickyNoteFromCloud(nId));

        get().showToast(`✨ Tarefa "${newTask.title}" criada e ${noteIds.length} notas arquivadas!`);

        return newTask;
      },
    }),
    {
      name: 'areatask-storage-v1',
      partialize: (state) => ({
        areas: state.areas,
        tasks: state.tasks,
        selectedAreaId: state.selectedAreaId,
        stickyNotes: state.stickyNotes,
        workspaceView: state.workspaceView,
        pendingSyncQueue: state.pendingSyncQueue,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
