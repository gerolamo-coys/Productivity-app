'use client';

import React from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AreaIcon } from '@/components/icons/AreaIcon';
import {
  Layers,
  Search,
  Plus,
  X,
  Mic,
} from 'lucide-react';
import { TaskFilter } from '@/types/productivity';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const {
    areas,
    selectedAreaId,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    openAreaModal,
    openDocumentsModal,
    workspaceView,
    setWorkspaceView,
    stickyNotes,
    isCloudConnected,
    isCloudSyncing,
    isOnline,
    pendingSyncQueue,
    flushPendingSyncQueue,
    setIsVoiceDumpOpen,
  } = useProductivityStore();

  const currentArea = areas.find((a) => a.id === selectedAreaId);
  const totalDocsCount = areas.reduce(
    (acc, a) => acc + (a.documents?.length || 0),
    0
  );

  const areaNotesCount = currentArea
    ? stickyNotes.filter((n) => n.areaId === currentArea.id).length
    : stickyNotes.length;

  const filters: { id: TaskFilter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'active', label: 'Ativas' },
    { id: 'completed', label: 'Feitas' },
  ];

  const pendingCount = pendingSyncQueue?.length || 0;

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 md:px-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Identidade da Área / Título */}
        <div className="flex items-center gap-3">
          {currentArea ? (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: currentArea.color }}
            >
              <AreaIcon name={currentArea.iconName} className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {currentArea ? currentArea.name : 'Todas as Tarefas'}
              </h2>
              {currentArea && (
                <button
                  onClick={() => openAreaModal(currentArea)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  title="Configurar Cérebro de Contexto"
                >
                  Editar Área
                </button>
              )}
              {/* Botão de Materiais de Apoio da Área */}
              <button
                onClick={() => openDocumentsModal(currentArea?.id || null)}
                className="text-[11px] px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition flex items-center gap-1.5 shadow-2xs font-medium"
                title="Gerenciar documentos e materiais de apoio desta Área"
              >
                <span>📚</span>
                <span>
                  Materiais (
                  {currentArea
                    ? currentArea.documents?.length || 0
                    : totalDocsCount}
                  )
                </span>
              </button>

              {/* Status de Sincronização em Nuvem & Offline */}
              <button
                type="button"
                onClick={() => isOnline && flushPendingSyncQueue()}
                className={cn(
                  'text-[11px] px-2.5 py-0.5 rounded-full border transition flex items-center gap-1.5 shadow-2xs font-medium',
                  !isOnline
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : pendingCount > 0
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 cursor-pointer'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-500 dark:text-neutral-400'
                )}
                title={
                  !isOnline
                    ? `Modo Offline (${pendingCount} alteração(ões) salva(s) localmente)`
                    : isCloudSyncing
                    ? 'Sincronizando com Supabase...'
                    : pendingCount > 0
                    ? `${pendingCount} alteração(ões) pendente(s). Clique para sincronizar agora.`
                    : isCloudConnected
                    ? 'Conectado à nuvem (Supabase Realtime ativo)'
                    : 'Modo Local'
                }
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    !isOnline
                      ? 'bg-rose-500'
                      : isCloudSyncing
                      ? 'bg-amber-400 animate-pulse'
                      : pendingCount > 0
                      ? 'bg-amber-500'
                      : isCloudConnected
                      ? 'bg-emerald-500 shadow-xs'
                      : 'bg-neutral-400'
                  )}
                />
                <span className="hidden sm:inline">
                  {!isOnline
                    ? pendingCount > 0
                      ? `Offline (${pendingCount})`
                      : 'Offline'
                    : isCloudSyncing
                    ? 'Sincronizando...'
                    : pendingCount > 0
                    ? `Sincronizar (${pendingCount})`
                    : isCloudConnected
                    ? 'Nuvem OK'
                    : 'Local'}
                </span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 truncate max-w-xs md:max-w-md">
              {currentArea
                ? currentArea.description || 'Espaço de foco dedicado'
                : 'Visão unificada de ação em todas as suas áreas de vida e projetos'}
            </p>
          </div>
        </div>

        {/* Controles: Visualização, Busca e Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Alternador de Visão: Tarefas vs Mural de Notas */}
          <div className="flex p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setWorkspaceView('tasks')}
              className={cn(
                'px-3 py-1 rounded-lg font-semibold transition text-xs flex items-center gap-1.5 cursor-pointer',
                workspaceView === 'tasks'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              )}
            >
              <span>📋</span>
              <span>Tarefas</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceView('notes')}
              className={cn(
                'px-3 py-1 rounded-lg font-semibold transition text-xs flex items-center gap-1.5 cursor-pointer',
                workspaceView === 'notes'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              )}
            >
              <span>📌</span>
              <span>Mural</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[10px] font-mono',
                  workspaceView === 'notes'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold'
                    : 'bg-neutral-200/70 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                )}
              >
                {areaNotesCount}
              </span>
            </button>
          </div>

          {/* Barra de busca e filtros apenas quando em visão de Tarefas */}
          {workspaceView === 'tasks' && (
            <>
              {/* Barra de busca */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarefas..."
                  className="w-full sm:w-44 pl-8 pr-7 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Segmented Control de Filtro */}
              <div className="flex p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'px-3 py-1 rounded-lg font-medium transition text-xs',
                      filter === f.id
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Botão Voice Dump Desktop */}
          <button
            type="button"
            onClick={() => setIsVoiceDumpOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-xs cursor-pointer"
            title="Gravar Voice Dump com IA (Ctrl+Shift+V)"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voz</span>
          </button>

          {/* Botão Nova Área */}
          <button
            onClick={() => openAreaModal()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Área</span>
          </button>
        </div>
      </div>
    </header>
  );
}
