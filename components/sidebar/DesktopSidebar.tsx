'use client';

import React from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AreaIcon } from '@/components/icons/AreaIcon';
import {
  Plus,
  Settings2,
  Layers,
  Brain,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DesktopSidebar() {
  const {
    areas,
    tasks,
    selectedAreaId,
    setSelectedAreaId,
    openAreaModal,
    openDocumentsModal,
  } = useProductivityStore();

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status !== 'completed').length;
  const activeArea = areas.find((a) => a.id === selectedAreaId);

  return (
    <aside className="w-72 bg-neutral-50 dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full select-none">
      {/* Brand & Título do App */}
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
              AreaTask
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold rounded">
                IA
              </span>
            </h1>
            <p className="text-[11px] text-neutral-500">Produtividade Orientada a Ação</p>
          </div>
        </div>
      </div>

      {/* Navegação e Seções */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Item Visão Geral */}
        <div>
          <button
            onClick={() => setSelectedAreaId(null)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition group',
              selectedAreaId === null
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 opacity-80" />
              <span>Todas as Áreas</span>
            </div>
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                selectedAreaId === null
                  ? 'bg-neutral-800 text-neutral-200 dark:bg-neutral-200 dark:text-neutral-800'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              )}
            >
              {activeTasks} / {totalTasks}
            </span>
          </button>
        </div>

        {/* Cabeçalho da Lista de Áreas */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
              Suas Áreas
            </span>
            <button
              onClick={() => openAreaModal()}
              className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition"
              title="Criar Nova Área"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Itens de Área */}
          <div className="space-y-1">
            {areas.map((area) => {
              const areaTasks = tasks.filter((t) => t.areaId === area.id);
              const areaActiveTasks = areaTasks.filter((t) => t.status !== 'completed').length;
              const isSelected = selectedAreaId === area.id;

              return (
                <div
                  key={area.id}
                  className={cn(
                    'group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer',
                    isSelected
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/80 dark:border-neutral-700/60 font-semibold'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 font-medium'
                  )}
                  onClick={() => setSelectedAreaId(area.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: area.color }}
                    >
                      <AreaIcon name={area.iconName} className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{area.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium',
                        isSelected
                          ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                          : 'text-neutral-400 group-hover:text-neutral-600'
                      )}
                    >
                      {areaActiveTasks}
                    </span>

                    {/* Botão de Materiais de Apoio */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDocumentsModal(area.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title="Materiais de Apoio e PDFs"
                    >
                      <BookOpen className="w-3 h-3" />
                    </button>

                    {/* Botão de edição */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAreaModal(area);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                      title="Editar Área e Cérebro de Contexto"
                    >
                      <Settings2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card de Espiada do Cérebro de Contexto da Área Ativa */}
        {activeArea && (
          <div className="pt-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/10 border border-indigo-100/80 dark:border-indigo-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-semibold text-[11px]">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Cérebro de Contexto</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDocumentsModal(activeArea.id)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    title="Ver ou adicionar materiais"
                  >
                    <span>Materiais ({activeArea.documents?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => openAreaModal(activeArea)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    Editar <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-3 leading-relaxed">
                {activeArea.contextBrainPrompt || 'Nenhum contexto definido ainda. Clique em Editar para treinar a IA nesta área.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé Informativo (com pl-14 para não sobrepor o badge do Next.js) */}
      <div className="py-4 pr-4 pl-14 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-neutral-400 text-[11px]">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Armazenamento Local</span>
        </div>
        <span className="font-mono text-[10px] text-neutral-500">Fase 2</span>
      </div>
    </aside>
  );
}
