'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { StickyNoteItem } from './StickyNoteItem';
import { StickyNoteColor } from '@/types/productivity';
import { AreaIcon } from '@/components/icons/AreaIcon';
import {
  Plus,
  Trash2,
  LayoutGrid,
  Move,
  StickyNote as StickyIcon,
  Zap,
  RotateCw,
  X,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function StickyNotesBoard() {
  const {
    areas,
    selectedAreaId,
    stickyNotes,
    addStickyNote,
    clearStickyNotesInArea,
    mergeNotesIntoTask,
    showToast,
  } = useProductivityStore();

  const [layoutMode, setLayoutMode] = useState<'freeform' | 'grid'>('freeform');
  const [selectedColor, setSelectedColor] = useState<StickyNoteColor>('yellow');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const currentArea = areas.find((a) => a.id === selectedAreaId);
  const activeAreaId = currentArea?.id || areas[0]?.id || 'area-general';

  // Filtra as notas da Área selecionada (ou todas se nenhuma selecionada)
  const areaNotes = selectedAreaId
    ? stickyNotes.filter((n) => n.areaId === selectedAreaId)
    : stickyNotes;

  const handleCreateNote = (color?: StickyNoteColor) => {
    addStickyNote({
      areaId: activeAreaId,
      content: '',
      color: color || selectedColor,
    });
  };

  const handleToggleSelectNote = (noteId: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedNoteIds.length === areaNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(areaNotes.map((n) => n.id));
    }
  };

  const handleMergeNotes = async () => {
    const selectedNotes = areaNotes.filter((n) => selectedNoteIds.includes(n.id));
    const validNotes = selectedNotes.map((n) => n.content.trim()).filter(Boolean);

    if (validNotes.length < 2) {
      showToast('Pelo menos 2 das notas selecionadas precisam conter anotações para serem mescladas.');
      return;
    }

    setIsMerging(true);
    try {
      const area = areas.find((a) => a.id === activeAreaId);
      const res = await fetch('/api/ai/notes/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: validNotes,
          areaName: area ? area.name : 'Geral',
          contextBrainPrompt: area?.contextBrainPrompt || '',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao sintetizar notas.');
      }

      const synthesized = await res.json();

      mergeNotesIntoTask({
        noteIds: selectedNoteIds,
        areaId: activeAreaId,
        title: synthesized.title || 'Nova Tarefa Consolidada',
        description: synthesized.description || '',
        subtasks: Array.isArray(synthesized.subtasks) ? synthesized.subtasks : [],
        estimatedEffort: synthesized.estimatedEffort || '30min',
        keyTips: Array.isArray(synthesized.keyTips) ? synthesized.keyTips : [],
      });

      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSelectedNoteIds([]);
    } catch (err: unknown) {
      console.error('Falha ao mesclar notas:', err);
      showToast(err instanceof Error ? err.message : 'Erro ao sintetizar notas.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleClearAll = () => {
    if (areaNotes.length === 0) return;
    if (
      window.confirm(
        `Tem certeza que deseja apagar todas as ${areaNotes.length} notas adesivas desta área?`
      )
    ) {
      if (selectedAreaId) {
        clearStickyNotesInArea(selectedAreaId);
      } else {
        areas.forEach((a) => clearStickyNotesInArea(a.id));
      }
      setSelectedNoteIds([]);
    }
  };

  const COLOR_BUTTONS: { color: StickyNoteColor; label: string; bg: string }[] = [
    { color: 'yellow', label: 'Amarelo', bg: 'bg-amber-300' },
    { color: 'green', label: 'Verde', bg: 'bg-emerald-400' },
    { color: 'purple', label: 'Roxo', bg: 'bg-purple-400' },
    { color: 'rose', label: 'Rosa', bg: 'bg-rose-400' },
    { color: 'blue', label: 'Azul', bg: 'bg-sky-400' },
  ];

  return (
    <div className="space-y-4 relative">
      {/* Barra de Ferramentas Superior do Mural */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="flex items-center gap-2.5">
          {currentArea ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: `${currentArea.color}15`,
                borderColor: `${currentArea.color}35`,
                color: currentArea.color,
              }}
            >
              <AreaIcon name={currentArea.iconName} className="w-3.5 h-3.5" />
              <span>{currentArea.name}</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <StickyIcon className="w-4 h-4 text-amber-500" />
              <span>Mural Geral de Notas</span>
            </span>
          )}

          <span className="text-xs text-neutral-400 font-mono">
            {areaNotes.length} {areaNotes.length === 1 ? 'nota' : 'notas'}
          </span>

          {areaNotes.length >= 2 && (
            <button
              type="button"
              onClick={handleSelectAllToggle}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer ml-1"
              title="Selecionar ou desmarcar todas as notas"
            >
              <CheckSquare className="w-3 h-3" />
              <span>
                {selectedNoteIds.length === areaNotes.length
                  ? 'Desmarcar todas'
                  : 'Selecionar todas'}
              </span>
            </button>
          )}
        </div>

        {/* Ações de Criação e Layout */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor Rápido de Cores para Nova Nota */}
          <div className="flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            {COLOR_BUTTONS.map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => {
                  setSelectedColor(c.color);
                  handleCreateNote(c.color);
                }}
                className={cn(
                  'w-4 h-4 rounded-full border border-black/10 dark:border-white/10 transition hover:scale-125 cursor-pointer',
                  c.bg,
                  selectedColor === c.color && 'ring-2 ring-neutral-900 dark:ring-white scale-110'
                )}
                title={`Criar nova nota ${c.label}`}
              />
            ))}
          </div>

          {/* Botão Principal "+ Nova Nota" */}
          <button
            type="button"
            onClick={() => handleCreateNote()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Nota</span>
          </button>

          {/* Alternador de Layout: Livre (Canvas) vs Grade */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setLayoutMode('freeform')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1',
                layoutMode === 'freeform'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              )}
              title="Modo Livre (Arraste livre pelo quadro)"
            >
              <Move className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Livre</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1',
                layoutMode === 'grid'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              )}
              title="Modo Grade (Organização automática)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Grade</span>
            </button>
          </div>

          {/* Limpar Mural */}
          {areaNotes.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
              title="Limpar todas as notas desta área"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tela do Mural: Livre ou Grade */}
      {areaNotes.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-xs">
            <StickyIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Mural de Notas Vazio
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Cole fórmulas, rascunhos livres, comandos e ideias rápidas para a área{' '}
              <strong className="text-neutral-700 dark:text-neutral-300">
                {currentArea?.name || 'Geral'}
              </strong>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCreateNote()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Primeira Nota</span>
          </button>
        </div>
      ) : layoutMode === 'freeform' ? (
        <div className="relative min-h-[640px] w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 p-4 overflow-auto shadow-inner bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:20px_20px]">
          {areaNotes.map((note) => (
            <StickyNoteItem
              key={note.id}
              note={note}
              isDraggable={true}
              isSelected={selectedNoteIds.includes(note.id)}
              onToggleSelect={() => handleToggleSelectNote(note.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {areaNotes.map((note) => (
            <div key={note.id} className="w-full">
              <StickyNoteItem
                note={note}
                isDraggable={false}
                isSelected={selectedNoteIds.includes(note.id)}
                onToggleSelect={() => handleToggleSelectNote(note.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Dock Flutuante de Mesclagem de Notas */}
      {selectedNoteIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-neutral-900/95 dark:bg-neutral-800/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-700/60 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-neutral-700/60">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {selectedNoteIds.length}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">
              {selectedNoteIds.length} notas selecionadas
            </span>
          </div>

          <button
            type="button"
            onClick={handleMergeNotes}
            disabled={isMerging}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition cursor-pointer',
              isMerging && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isMerging ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sintetizando com IA...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                <span>Mesclar em 1 Tarefa</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectedNoteIds([])}
            disabled={isMerging}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            title="Cancelar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
