'use client';

import React from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AreaIcon } from '@/components/icons/AreaIcon';
import { Layers, Plus, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileAreaNav() {
  const {
    areas,
    tasks,
    selectedAreaId,
    setSelectedAreaId,
    openAreaModal,
    setIsVoiceDumpOpen,
  } = useProductivityStore();

  return (
    <div className="md:hidden sticky top-0 z-20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 px-3 py-2.5 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max">
        {/* Botão de Voice Dump Mobile */}
        <button
          type="button"
          onClick={() => setIsVoiceDumpOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs shrink-0 cursor-pointer"
          title="Gravar Voice Dump com IA"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voz</span>
        </button>

        {/* Pílula Todas as Áreas */}
        <button
          onClick={() => setSelectedAreaId(null)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0',
            selectedAreaId === null
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todas</span>
          <span className="text-[10px] opacity-75 font-mono">
            {tasks.filter((t) => t.status !== 'completed').length}
          </span>
        </button>

        {/* Áreas Individuais */}
        {areas.map((area) => {
          const isSelected = selectedAreaId === area.id;
          const areaActiveCount = tasks.filter(
            (t) => t.areaId === area.id && t.status !== 'completed'
          ).length;

          return (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 border',
                isSelected
                  ? 'border-neutral-900 dark:border-white bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                  : 'border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-850 text-neutral-700 dark:text-neutral-300'
              )}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: area.color }}
              />
              <AreaIcon name={area.iconName} className="w-3 h-3" />
              <span>{area.name}</span>
              <span className="text-[10px] opacity-75 font-mono">
                {areaActiveCount}
              </span>
            </button>
          );
        })}

        {/* Pílula Nova Área */}
        <button
          onClick={() => openAreaModal()}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-dashed border-neutral-300 dark:border-neutral-700 shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Área</span>
        </button>
      </div>
    </div>
  );
}
