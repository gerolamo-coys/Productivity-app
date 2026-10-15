'use client';

import React, { useState, useRef } from 'react';
import { StickyNote, StickyNoteColor } from '@/types/productivity';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import {
  Trash2,
  GripHorizontal,
  Pin,
  Sparkles,
  RotateCw,
  Undo2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNoteItemProps {
  note: StickyNote;
  isDraggable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const COLOR_STYLES: Record<
  StickyNoteColor,
  {
    bg: string;
    border: string;
    header: string;
    text: string;
    pin: string;
    textarea: string;
  }
> = {
  yellow: {
    bg: 'bg-amber-100 dark:bg-amber-950/80',
    border: 'border-amber-300 dark:border-amber-800/70',
    header: 'bg-amber-200/80 dark:bg-amber-900/60 border-amber-300/80 dark:border-amber-800/50',
    text: 'text-amber-950 dark:text-amber-100',
    pin: 'text-amber-600 dark:text-amber-400',
    textarea: 'text-amber-950 dark:text-amber-100 placeholder-amber-700/50 dark:placeholder-amber-400/50',
  },
  green: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/80',
    border: 'border-emerald-300 dark:border-emerald-800/70',
    header: 'bg-emerald-200/80 dark:bg-emerald-900/60 border-emerald-300/80 dark:border-emerald-800/50',
    text: 'text-emerald-950 dark:text-emerald-100',
    pin: 'text-emerald-600 dark:text-emerald-400',
    textarea: 'text-emerald-950 dark:text-emerald-100 placeholder-emerald-700/50 dark:placeholder-emerald-400/50',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950/80',
    border: 'border-purple-300 dark:border-purple-800/70',
    header: 'bg-purple-200/80 dark:bg-purple-900/60 border-purple-300/80 dark:border-purple-800/50',
    text: 'text-purple-950 dark:text-purple-100',
    pin: 'text-purple-600 dark:text-purple-400',
    textarea: 'text-purple-950 dark:text-purple-100 placeholder-purple-700/50 dark:placeholder-purple-400/50',
  },
  rose: {
    bg: 'bg-rose-100 dark:bg-rose-950/80',
    border: 'border-rose-300 dark:border-rose-800/70',
    header: 'bg-rose-200/80 dark:bg-rose-900/60 border-rose-300/80 dark:border-rose-800/50',
    text: 'text-rose-950 dark:text-rose-100',
    pin: 'text-rose-600 dark:text-rose-400',
    textarea: 'text-rose-950 dark:text-rose-100 placeholder-rose-700/50 dark:placeholder-rose-400/50',
  },
  blue: {
    bg: 'bg-sky-100 dark:bg-sky-950/80',
    border: 'border-sky-300 dark:border-sky-800/70',
    header: 'bg-sky-200/80 dark:bg-sky-900/60 border-sky-300/80 dark:border-sky-800/50',
    text: 'text-sky-950 dark:text-sky-100',
    pin: 'text-sky-600 dark:text-sky-400',
    textarea: 'text-sky-950 dark:text-sky-100 placeholder-sky-700/50 dark:placeholder-sky-400/50',
  },
};

const COLOR_OPTIONS: StickyNoteColor[] = ['yellow', 'green', 'purple', 'rose', 'blue'];

export function StickyNoteItem({
  note,
  isDraggable = true,
  isSelected = false,
  onToggleSelect,
}: StickyNoteItemProps) {
  const {
    areas,
    updateStickyNote,
    deleteStickyNote,
    bringStickyNoteToFront,
    showToast,
  } = useProductivityStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [previousContent, setPreviousContent] = useState<string | null>(null);

  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: note.x,
    initialY: note.y,
  });

  const colors = COLOR_STYLES[note.color] || COLOR_STYLES.yellow;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDraggable) return;
    // Traz a nota para frente ao interagir
    bringStickyNoteToFront(note.id);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: note.x,
      initialY: note.y,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !isDraggable) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(10, dragStartRef.current.initialX + deltaX);
    const newY = Math.max(10, dragStartRef.current.initialY + deltaY);

    updateStickyNote(note.id, { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignora erro se não capturado
    }
  };

  // Ação de Lapidar / Organizar com IA (Gemini)
  const handlePolish = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!note.content.trim()) {
      showToast('Escreva algo na nota antes de lapidar com IA.');
      return;
    }

    const currentArea = areas.find((a) => a.id === note.areaId);

    setIsPolishing(true);
    try {
      const res = await fetch('/api/ai/notes/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: note.content,
          areaName: currentArea?.name || 'Geral',
          contextBrainPrompt: currentArea?.contextBrainPrompt || '',
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro ao lapidar nota: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.polishedContent) {
        setPreviousContent(note.content);
        updateStickyNote(note.id, { content: data.polishedContent });
        showToast('✨ Nota lapidada e organizada com sucesso!');
      }
    } catch (err: any) {
      console.error('Falha ao lapidar nota:', err);
      showToast('Não foi possível lapidar a nota no momento.');
    } finally {
      setIsPolishing(false);
    }
  };

  // Reversão (Undo) para o rascunho anterior
  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previousContent !== null) {
      updateStickyNote(note.id, { content: previousContent });
      setPreviousContent(null);
      showToast('Nota restaurada para o rascunho anterior.');
    }
  };

  return (
    <div
      onClick={() => bringStickyNoteToFront(note.id)}
      style={
        isDraggable
          ? {
              position: 'absolute',
              left: `${note.x}px`,
              top: `${note.y}px`,
              zIndex: note.zIndex || 1,
            }
          : undefined
      }
      className={cn(
        'group relative w-72 min-h-[180px] rounded-xl border shadow-md transition-all select-none flex flex-col',
        colors.bg,
        colors.border,
        isSelected && 'ring-2 ring-indigo-500 shadow-xl scale-[1.01]',
        isDragging && 'shadow-2xl scale-[1.02] cursor-grabbing'
      )}
    >
      {/* Barra Superior / Alça de Arraste */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          'px-3 py-2 border-b flex items-center justify-between rounded-t-xl cursor-grab',
          colors.header
        )}
      >
        <div className="flex items-center gap-1.5">
          {onToggleSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0 mr-0.5',
                isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'border-black/30 dark:border-white/30 hover:border-indigo-500 bg-white/40 dark:bg-black/20'
              )}
              title={isSelected ? 'Desmarcar nota' : 'Selecionar nota para mesclar em tarefa'}
            >
              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          )}
          <Pin className={cn('w-3.5 h-3.5 fill-current', colors.pin)} />
          <GripHorizontal className="w-4 h-4 opacity-40 group-hover:opacity-80 transition" />
        </div>

        {/* Ferramentas: Lapidar com IA + Paleta de Cores + Exclusão */}
        <div className="flex items-center gap-1.5">
          {/* Botão ✨ Lapidar / Organizar */}
          <button
            type="button"
            onClick={handlePolish}
            disabled={isPolishing}
            className={cn(
              'p-1 rounded text-indigo-700 dark:text-indigo-300 hover:bg-white/60 dark:hover:bg-black/20 transition cursor-pointer flex items-center gap-1',
              isPolishing && 'opacity-60 cursor-not-allowed'
            )}
            title="Lapidar e Organizar com IA (bullets, código e fórmulas)"
          >
            {isPolishing ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition" />
            )}
          </button>

          {/* Paleta de Cores */}
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStickyNote(note.id, { color: c });
                }}
                className={cn(
                  'w-3 h-3 rounded-full border border-black/20 dark:border-white/20 transition hover:scale-125 cursor-pointer',
                  c === 'yellow' && 'bg-amber-300',
                  c === 'green' && 'bg-emerald-400',
                  c === 'purple' && 'bg-purple-400',
                  c === 'rose' && 'bg-rose-400',
                  c === 'blue' && 'bg-sky-400',
                  note.color === c && 'ring-1.5 ring-neutral-800 dark:ring-white scale-110'
                )}
                title={`Mudar cor para ${c}`}
              />
            ))}
          </div>

          {/* Excluir Nota */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteStickyNote(note.id);
            }}
            className="p-1 rounded text-neutral-500 hover:text-red-600 dark:hover:text-red-400 opacity-60 group-hover:opacity-100 transition cursor-pointer"
            title="Excluir nota"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Área Editável de Conteúdo */}
      <div className="p-3 flex-1 flex flex-col">
        <textarea
          value={note.content}
          onChange={(e) => updateStickyNote(note.id, { content: e.target.value })}
          placeholder="Escreva uma fórmula, lembrete ou código... Depois clique em ✨ para lapidar!"
          className={cn(
            'w-full flex-1 bg-transparent resize-none focus:outline-none text-xs font-mono leading-relaxed select-text',
            colors.textarea
          )}
          rows={6}
        />

        {/* Rodapé da Nota: Data, Contador e Botão Desfazer */}
        <div className="pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] opacity-70 font-mono">
          <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>

          {previousContent !== null ? (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
              title="Voltar ao rascunho anterior antes da lapidação"
            >
              <Undo2 className="w-3 h-3" />
              <span>Desfazer</span>
            </button>
          ) : (
            <span className="opacity-60">{note.content.length} carac.</span>
          )}
        </div>
      </div>
    </div>
  );
}
