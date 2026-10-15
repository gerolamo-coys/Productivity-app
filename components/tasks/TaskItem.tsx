'use client';

import React, { useState } from 'react';
import { Task, EffortLevel } from '@/types/productivity';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AreaIcon } from '@/components/icons/AreaIcon';
import {
  Check,
  Trash2,
  Pin,
  Sparkles,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ListTodo,
  BookOpen,
  Zap,
  Plus,
  X,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface TaskItemProps {
  task: Task;
}

const EFFORT_CONFIG: Record<
  EffortLevel,
  { label: string; icon: string; bg: string; text: string }
> = {
  '5min': {
    label: '5 min',
    icon: '⚡',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  '15min': {
    label: '15 min',
    icon: '⚡',
    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    text: 'text-teal-700 dark:text-teal-300',
  },
  '30min': {
    label: '30 min',
    icon: '⏱️',
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  },
  '1h+': {
    label: '1h+',
    icon: '⏳',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  deep_work: {
    label: 'Foco Profundo',
    icon: '🧠',
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
  },
};

export function TaskItem({ task }: TaskItemProps) {
  const {
    areas,
    toggleTask,
    deleteTask,
    togglePinNow,
    generateTaskBrief,
    convertAiStepsToSubtasks,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    requestUnstickAction,
    setUnstickAction,
    setTaskPauseContext,
    clearTaskPauseContext,
    setTaskDesktopLaunchUrl,
  } = useProductivityStore();

  const [isAiExpanded, setIsAiExpanded] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isEditingPause, setIsEditingPause] = useState(false);
  const [pauseInput, setPauseInput] = useState(task.pauseContext?.note || '');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(task.desktopLaunchUrl || '');

  const area = areas.find((a) => a.id === task.areaId);
  const isCompleted = task.status === 'completed';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 },
          colors: [area?.color || '#6366f1', '#10b981', '#f59e0b'],
        });
      } catch (err) {
        // Fallback silencioso
      }
    }
    toggleTask(task.id);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinNow(task.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    generateTaskBrief(task.id);
  };

  const handleConvertSteps = (e: React.MouseEvent) => {
    e.stopPropagation();
    convertAiStepsToSubtasks(task.id);
  };

  const handleUnstick = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestUnstickAction(task.id);
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
    }
  };

  const effortInfo = task.aiBrief?.estimatedEffort
    ? EFFORT_CONFIG[task.aiBrief.estimatedEffort]
    : null;

  const hasSubtasks = Boolean(task.subtasks && task.subtasks.length > 0);

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-neutral-900 border rounded-2xl p-4 transition-all duration-150 hover:shadow-md',
        isCompleted
          ? 'border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/60 dark:bg-neutral-900/40 opacity-75'
          : 'border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
      )}
    >
      <div className="flex items-start gap-3.5">
        {/* Checkbox de Conclusão */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'w-5 h-5 rounded-lg border flex items-center justify-center mt-0.5 shrink-0 transition-all cursor-pointer',
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : 'border-neutral-300 dark:border-neutral-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
          )}
          title={isCompleted ? 'Marcar como não concluída' : 'Marcar como concluída'}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Corpo do Conteúdo */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Linha de Metadados: Badge da Área + Esforço + Pin */}
          <div className="flex items-center gap-2 flex-wrap">
            {area && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs"
                style={{
                  backgroundColor: `${area.color}15`,
                  borderColor: `${area.color}35`,
                  color: area.color,
                }}
              >
                <AreaIcon name={area.iconName} className="w-3 h-3" />
                <span>{area.name}</span>
              </span>
            )}

            {/* Badge de Esforço Estimado */}
            {effortInfo && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs',
                  effortInfo.bg,
                  effortInfo.text
                )}
                title={`Esforço estimado: ${effortInfo.label}`}
              >
                <span>{effortInfo.icon}</span>
                <span>{effortInfo.label}</span>
              </span>
            )}

            {task.isPinnedNow && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                <Pin className="w-2.5 h-2.5 fill-current" />
                <span>Foco Agora</span>
              </span>
            )}

            {task.pauseContext && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/40">
                <Pause className="w-2.5 h-2.5" />
                <span>Pausada</span>
              </span>
            )}

            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-neutral-400 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Título da Tarefa */}
          <h3
            className={cn(
              'text-sm font-semibold leading-snug transition text-neutral-900 dark:text-neutral-100',
              isCompleted && 'line-through text-neutral-400 dark:text-neutral-500'
            )}
          >
            {task.title}
          </h3>

          {/* Descrição Opcional */}
          {task.description && (
            <p
              className={cn(
                'text-xs text-neutral-500 leading-relaxed',
                isCompleted && 'line-through opacity-70'
              )}
            >
              {task.description}
            </p>
          )}

          {/* Botão de Destaque: 🚀 Abrir Workspace (Desktop Handoff) */}
          {task.desktopLaunchUrl && !isEditingUrl && (
            <div className="mt-2 flex items-center gap-2 flex-wrap animate-in fade-in">
              <a
                href={
                  task.desktopLaunchUrl.startsWith('http://') ||
                  task.desktopLaunchUrl.startsWith('https://') ||
                  task.desktopLaunchUrl.startsWith('vscode://')
                    ? task.desktopLaunchUrl
                    : `https://${task.desktopLaunchUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs transition hover:scale-[1.02] cursor-pointer"
                title={`Abrir ${task.desktopLaunchUrl} em nova aba`}
              >
                <span>🚀 Abrir Workspace</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUrlInput(task.desktopLaunchUrl || '');
                  setIsEditingUrl(true);
                }}
                className="text-[11px] font-medium text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-1 py-0.5 transition cursor-pointer"
                title="Editar atalho do workspace"
              >
                Editar link
              </button>
            </div>
          )}

          {/* Formulário Inline para Editar Link do Workspace */}
          {isEditingUrl && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTaskDesktopLaunchUrl(task.id, urlInput);
                setIsEditingUrl(false);
              }}
              className="mt-2 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Atalho do Workspace (Desktop Handoff):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                autoFocus
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="ex: https://github.com/usuario/repo, http://localhost:3000, ou link Figma"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1.5 focus:ring-indigo-500 font-mono"
              />
              <div className="flex items-center justify-between text-[11px] text-indigo-700/80 dark:text-indigo-400/80 flex-wrap gap-2">
                <span>Clique único no botão "🚀 Abrir Workspace" para iniciar no PC.</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {task.desktopLaunchUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskDesktopLaunchUrl(task.id, '');
                        setIsEditingUrl(false);
                      }}
                      className="px-2 py-1 text-xs text-red-500 hover:text-red-700 rounded cursor-pointer"
                    >
                      Remover Link
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingUrl(false)}
                    className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    Salvar Atalho
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Banner Onde Parei (Pause Context) */}
          {task.pauseContext?.note && !isEditingPause && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-700/60 flex items-start justify-between gap-2 shadow-2xs">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                  ⏸ Parei aqui:
                </span>
                <span className="text-xs text-amber-950 dark:text-amber-200 font-medium break-words leading-relaxed">
                  "{task.pauseContext.note}"
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPauseInput(task.pauseContext?.note || '');
                    setIsEditingPause(true);
                  }}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline px-1 py-0.5 cursor-pointer"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearTaskPauseContext(task.id);
                  }}
                  className="text-[11px] text-neutral-500 hover:text-amber-700 dark:hover:text-amber-300 px-1 py-0.5 cursor-pointer"
                  title="Retomar tarefa"
                >
                  Retomar
                </button>
              </div>
            </div>
          )}

          {/* Formulário Inline para Registrar Onde Parou */}
          {isEditingPause && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pauseInput.trim()) {
                  setTaskPauseContext(task.id, pauseInput.trim());
                }
                setIsEditingPause(false);
              }}
              className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>Onde você parou nesta tarefa?</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingPause(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                autoFocus
                value={pauseInput}
                onChange={(e) => setPauseInput(e.target.value)}
                placeholder="ex: Parei no exercício 3 da lista / falta testar no Chrome"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1.5 focus:ring-amber-500"
              />
              <div className="flex items-center justify-between text-[11px] text-amber-700/80 dark:text-amber-400/80">
                <span>A IA continuará os passos sugeridos a partir deste ponto ao regerar.</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingPause(false)}
                    className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    Salvar Ponto
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Micro-Ação Anti-Procrastinação ("Preciso de um empurrão") */}
          {task.unstickAction && (
            <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/20 dark:via-orange-500/15 dark:to-amber-500/20 border border-amber-300 dark:border-amber-700/60 shadow-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <div className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 shadow-2xs mt-0.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    🚀 Micro-Ação Anti-Procrastinação (2 min)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnstickAction(task.id, '');
                    }}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-0.5 rounded cursor-pointer"
                    title="Dispensar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 mt-1 leading-snug">
                  "{task.unstickAction}"
                </p>
              </div>
            </div>
          )}

          {/* Estado de Carregamento Shimmer da IA */}
          {task.isAiGenerating && (
            <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  IA analisando tarefa com o Cérebro de {area?.name || 'Área'}...
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-500">Gemini 3.8</span>
            </div>
          )}

          {/* Card do Guia de Ação da IA (Retrátil) */}
          {task.aiBrief && !task.isAiGenerating && (
            <div className="mt-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-neutral-900 dark:to-purple-950/10 overflow-hidden shadow-2xs">
              {/* Barra do Cabeçalho */}
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-indigo-100/60 dark:border-indigo-900/30">
                <div
                  onClick={() => setIsAiExpanded(!isAiExpanded)}
                  className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 truncate">
                    Guia de Ação da IA
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100/80 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono shrink-0">
                    {task.aiBrief.modelUsed?.includes('gemini') ? 'Gemini 3.8 Flash' : 'Motor Contextual'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Botão de Destravar Micro-Ação */}
                  <button
                    type="button"
                    onClick={handleUnstick}
                    disabled={task.isUnstickLoading}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                    title="Preciso de um empurrão: Gerar micro-ação de 2 minutos"
                  >
                    {task.isUnstickLoading ? (
                      <>
                        <RotateCw className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Destravando...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 fill-current text-amber-500" />
                        <span>⚡ Destravar (2 min)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRegenerate}
                    className="p-1 rounded-md text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Regerar Guia da IA"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAiExpanded(!isAiExpanded)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
                  >
                    {isAiExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Conteúdo do Guia */}
              {isAiExpanded && (
                <div className="p-3.5 space-y-3 text-xs">
                  {/* Resumo */}
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                    {task.aiBrief.summary}
                  </p>

                  {/* Documentos de Apoio Consultados (Grounding) */}
                  {task.aiBrief.groundedDocuments &&
                    task.aiBrief.groundedDocuments.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-indigo-500" />
                          <span>Baseado em:</span>
                        </span>
                        {task.aiBrief.groundedDocuments.map((docName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white dark:bg-neutral-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs truncate max-w-xs"
                            title={`Grounding técnico do material: ${docName}`}
                          >
                            📄 {docName}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Dicas-Chave */}
                  {task.aiBrief.keyTips && task.aiBrief.keyTips.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {task.aiBrief.keyTips.map((tip, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 leading-snug"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Passos de Ação Sugeridos */}
                  {task.aiBrief.suggestedSteps &&
                    task.aiBrief.suggestedSteps.length > 0 && (
                      <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                            Passos Sugeridos
                          </span>
                          {!hasSubtasks && (
                            <button
                              type="button"
                              onClick={handleConvertSteps}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              <ListTodo className="w-3 h-3" />
                              <span>Transformar em checklist</span>
                            </button>
                          )}
                        </div>
                        <ol className="space-y-1.5 list-decimal list-inside text-neutral-600 dark:text-neutral-400">
                          {task.aiBrief.suggestedSteps.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">
                              <span className="text-neutral-800 dark:text-neutral-200">
                                {step}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Subtarefas / Checklist Interativo */}
          {hasSubtasks && (
            <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Subtarefas ({task.subtasks.filter((s) => s.isCompleted).length} / {task.subtasks.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(true)}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar subpasso</span>
                </button>
              </div>

              {/* Lista de Passos */}
              <div className="space-y-1">
                {task.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="group/sub flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition"
                  >
                    <div
                      onClick={() => toggleSubtask(task.id, st.id)}
                      className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition cursor-pointer',
                          st.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-neutral-300 dark:border-neutral-600 hover:border-emerald-500'
                        )}
                      >
                        {st.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span
                        className={cn(
                          'text-xs text-neutral-700 dark:text-neutral-300 select-none truncate',
                          st.isCompleted && 'line-through text-neutral-400 dark:text-neutral-500'
                        )}
                      >
                        {st.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSubtask(task.id, st.id);
                      }}
                      className="opacity-0 group-hover/sub:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition rounded cursor-pointer"
                      title="Excluir subpasso"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Form Inline "+ Adicionar Subpasso" */}
              {isAddingSubtask ? (
                <form
                  onSubmit={handleAddSubtaskSubmit}
                  className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-100"
                >
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Nome do subpasso..."
                    autoFocus
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSubtask(false);
                      setNewSubtaskTitle('');
                    }}
                    className="px-2 py-1 text-xs rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(true)}
                  className="w-full mt-1 py-1 px-2 flex items-center justify-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-300 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Adicionar subpasso</span>
                </button>
              )}
            </div>
          )}

          {/* Linha de Ações da Tarefa */}
          <div className="pt-2 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
            {!task.aiBrief && !task.isAiGenerating && (
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition mr-auto cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Gerar Guia com IA</span>
              </button>
            )}

            {/* Botão Pausar / Onde parei */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPauseInput(task.pauseContext?.note || '');
                setIsEditingPause(!isEditingPause);
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer',
                task.pauseContext
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shadow-2xs'
                  : 'text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
              title={task.pauseContext ? 'Editar onde parou' : 'Pausar e anotar onde parou'}
            >
              <Pause className="w-3 h-3" />
              <span className="hidden sm:inline">
                {task.pauseContext ? 'Pausada' : 'Pausar'}
              </span>
            </button>

            {/* Botão de Atalho do Workspace (Desktop Handoff) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUrlInput(task.desktopLaunchUrl || '');
                setIsEditingUrl(!isEditingUrl);
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer',
                task.desktopLaunchUrl
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                  : 'text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
              title={
                task.desktopLaunchUrl
                  ? `Workspace: ${task.desktopLaunchUrl} (Clique para editar)`
                  : 'Vincular link de Workspace (Figma, GitHub, localhost)'
              }
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Workspace</span>
            </button>

            {/* Botão de Fixar / Desafixar com Destaque Vibrante */}
            <button
              type="button"
              onClick={handleTogglePin}
              className={cn(
                'p-1.5 rounded-lg transition cursor-pointer',
                task.isPinnedNow
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                  : 'text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
              title={task.isPinnedNow ? 'Desafixar do Foco' : 'Fixar no Foco Agora (Máx 3)'}
            >
              <Pin className={cn('w-3.5 h-3.5', task.isPinnedNow && 'fill-current')} />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
              title="Excluir tarefa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
