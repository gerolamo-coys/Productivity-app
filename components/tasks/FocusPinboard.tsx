'use client';

import React, { useState } from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AreaIcon } from '@/components/icons/AreaIcon';
import {
  Pin,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export function FocusPinboard() {
  const {
    tasks,
    areas,
    toggleTask,
    togglePinNow,
    toggleSubtask,
  } = useProductivityStore();

  const [isExpanded, setIsExpanded] = useState(true);

  // Filtra as tarefas fixadas (máximo de 3) através de TODAS as áreas
  const pinnedTasks = tasks.filter((t) => t.isPinnedNow).slice(0, 3);

  if (pinnedTasks.length === 0) {
    return null;
  }

  const handleToggleTask = (taskId: string, areaColor?: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.status !== 'completed') {
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
          colors: [areaColor || '#6366f1', '#10b981', '#f59e0b'],
        });
      } catch (e) {
        // Fallback silencioso
      }
    }
    toggleTask(taskId);
  };

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-indigo-50/70 dark:from-indigo-950/40 dark:via-neutral-900 dark:to-purple-950/30 p-3.5 shadow-xs transition-all">
      {/* Cabeçalho do Foco Agora */}
      <div className="flex items-center justify-between gap-3">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-1"
        >
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
              ⚡ Foco Agora
            </h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
              {pinnedTasks.length}/3
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal hidden sm:inline">
              Tarefas prioritárias persistentes
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
          title={isExpanded ? 'Recolher Foco' : 'Expandir Foco'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Conteúdo Expandido dos Cards de Foco */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {pinnedTasks.map((task) => {
            const area = areas.find((a) => a.id === task.areaId);
            const isCompleted = task.status === 'completed';
            const totalSubtasks = task.subtasks?.length || 0;
            const completedSubtasks =
              task.subtasks?.filter((st) => st.isCompleted).length || 0;

            return (
              <div
                key={task.id}
                className={cn(
                  'group/pin relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-150 shadow-2xs bg-white dark:bg-neutral-900',
                  isCompleted
                    ? 'border-neutral-200/50 dark:border-neutral-800 opacity-70'
                    : 'border-indigo-100 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-neutral-700 hover:shadow-xs'
                )}
              >
                <div>
                  {/* Topo do Card: Badge da Área + Ação de Desafixar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {area ? (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate max-w-[150px]"
                        style={{
                          backgroundColor: `${area.color}15`,
                          borderColor: `${area.color}35`,
                          color: area.color,
                        }}
                      >
                        <AreaIcon name={area.iconName} className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{area.name}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-mono">Geral</span>
                    )}

                    <button
                      type="button"
                      onClick={() => togglePinNow(task.id)}
                      className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 p-0.5 rounded transition cursor-pointer"
                      title="Desafixar do Foco Agora"
                    >
                      <Pin className="w-3 h-3 fill-current" />
                    </button>
                  </div>

                  {/* Checkbox e Título */}
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id, area?.color)}
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition cursor-pointer',
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-emerald-500'
                      )}
                      title={isCompleted ? 'Marcar como pendente' : 'Concluir tarefa'}
                    >
                      {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>

                    <h3
                      className={cn(
                        'text-xs font-semibold leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100',
                        isCompleted && 'line-through text-neutral-400 dark:text-neutral-500'
                      )}
                      title={task.title}
                    >
                      {task.title}
                    </h3>
                  </div>

                  {/* Micro-Ação se existir */}
                  {task.unstickAction && (
                    <div className="mt-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[10px] text-amber-900 dark:text-amber-200 leading-snug flex items-center gap-1.5">
                      <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0 fill-current" />
                      <span className="truncate font-medium">{task.unstickAction}</span>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card: Progresso de Passos / Subtarefas */}
                <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
                  {totalSubtasks > 0 ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${(completedSubtasks / totalSubtasks) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400 font-semibold shrink-0">
                        {completedSubtasks}/{totalSubtasks} passos
                      </span>
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic">Sem subpassos</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
