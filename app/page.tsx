'use client';

import React from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { DesktopSidebar } from '@/components/sidebar/DesktopSidebar';
import { MobileAreaNav } from '@/components/navigation/MobileAreaNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { TaskInput } from '@/components/tasks/TaskInput';
import { TaskList } from '@/components/tasks/TaskList';
import { AreaModal } from '@/components/areas/AreaModal';
import { AreaDocumentsModal } from '@/components/areas/AreaDocumentsModal';
import { FocusPinboard } from '@/components/tasks/FocusPinboard';
import { StickyNotesBoard } from '@/components/notes/StickyNotesBoard';
import { VoiceDumpModal } from '@/components/tasks/VoiceDumpModal';
import { Toast } from '@/components/ui/Toast';
import { Brain, ChevronRight } from 'lucide-react';

export default function Home() {
  const {
    areas,
    selectedAreaId,
    openAreaModal,
    _hasHydrated,
    workspaceView,
    initCloudSync,
    setIsVoiceDumpOpen,
  } = useProductivityStore();

  const activeArea = areas.find((a) => a.id === selectedAreaId);
  const [isBannerCollapsed, setIsBannerCollapsed] = React.useState(true);

  // Inicializa sincronização em nuvem e listeners de Realtime (Supabase)
  React.useEffect(() => {
    const cleanup = initCloudSync();
    return () => {
      cleanup();
    };
  }, [initCloudSync]);

  // Atalhos Globais de Produtividade (Ctrl+K para foco e Ctrl+Shift+V para voz)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K: Focar na barra de tarefa
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const input = document.getElementById('global-task-input') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      }

      // Ctrl+Shift+V ou Cmd+Shift+V: Abrir Voice Dump
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setIsVoiceDumpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsVoiceDumpOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-100/50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Barra Lateral Desktop */}
      <div className="hidden md:flex shrink-0">
        <DesktopSidebar />
      </div>

      {/* Espaço de Trabalho Principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Navegação de Áreas Mobile */}
        <MobileAreaNav />

        {/* Cabeçalho Superior Global */}
        <AppHeader />

        {/* Painel de Tarefas Rolável */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Banner Retrátil do Cérebro de Contexto da Área Ativa */}
            {activeArea && (
              <div
                className="rounded-2xl border transition-all shadow-2xs overflow-hidden"
                style={{
                  backgroundColor: `${activeArea.color}08`,
                  borderColor: `${activeArea.color}30`,
                }}
              >
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div
                    onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
                    className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0 group"
                  >
                    <div
                      className="p-1.5 rounded-lg text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: activeArea.color }}
                    >
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                        Cérebro de Contexto: {activeArea.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-neutral-800 font-semibold border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
                        IA Pronta
                      </span>
                      <span className="text-[11px] text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 flex items-center gap-0.5 transition">
                        {isBannerCollapsed ? 'Ver Prompt' : 'Ocultar'}
                        <ChevronRight
                          className={`w-3 h-3 transition-transform duration-200 ${
                            isBannerCollapsed ? '' : 'rotate-90'
                          }`}
                        />
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => openAreaModal(activeArea)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition shrink-0"
                  >
                    <span>Editar Contexto</span>
                  </button>
                </div>

                {!isBannerCollapsed && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-neutral-200/40 dark:border-neutral-800/40 animate-in fade-in slide-in-from-top-1 duration-150">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-mono bg-white/60 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50">
                      {activeArea.contextBrainPrompt ||
                        'Nenhum prompt definido ainda. Clique em Editar Contexto para ensinar a IA.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {workspaceView === 'notes' ? (
              /* Mural de Notas Adesivas da Área */
              <div className="space-y-4">
                <StickyNotesBoard />
              </div>
            ) : (
              /* Fluxo de Execução de Tarefas */
              <>
                {/* Barra Persistente "⚡ Foco Agora" (Até 3 Tarefas Prioritárias) */}
                <FocusPinboard />

                {/* Campo Rápido de Criação de Tarefas */}
                <TaskInput />

                {/* Lista de Tarefas (Ativas, Feitas, Filtradas) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      {activeArea ? `Tarefas de ${activeArea.name}` : 'Fluxo de Ação'}
                    </h3>
                    <span className="text-xs text-neutral-400 font-medium">
                      {_hasHydrated ? 'Salvo localmente' : 'Sincronizando...'}
                    </span>
                  </div>

                  <TaskList />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Criação / Edição de Área */}
      <AreaModal />

      {/* Modal de Materiais de Apoio e PDFs da Área */}
      <AreaDocumentsModal />

      {/* Modal de Gravação e Roteamento de Tarefas por Voz (Voice Dump) */}
      <VoiceDumpModal />

      {/* Notificações Toast Flutuantes */}
      <Toast />
    </div>
  );
}
