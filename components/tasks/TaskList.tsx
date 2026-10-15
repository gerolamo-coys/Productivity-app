'use client';

import React from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { TaskItem } from './TaskItem';
import { CheckCircle2, Inbox, Search } from 'lucide-react';

export function TaskList() {
  const { tasks, areas, selectedAreaId, filter, searchQuery, _hasHydrated } =
    useProductivityStore();

  // Se ainda não hidratou no cliente, exibe esqueleto para evitar erro de hidratação
  if (!_hasHydrated) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Filtragem de tarefas
  const filteredTasks = tasks.filter((task) => {
    // 1. Filtro por Área
    if (selectedAreaId && task.areaId !== selectedAreaId) {
      return false;
    }

    // 2. Filtro por Status
    if (filter === 'active' && task.status === 'completed') {
      return false;
    }
    if (filter === 'completed' && task.status !== 'completed') {
      return false;
    }

    // 3. Filtro por Busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchTags = task.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    return true;
  });

  const activeArea = areas.find((a) => a.id === selectedAreaId);

  // Estados vazios informativos
  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-16 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center mb-3">
          {searchQuery ? (
            <Search className="w-5 h-5" />
          ) : filter === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Inbox className="w-5 h-5" />
          )}
        </div>

        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
          {searchQuery
            ? 'Nenhuma tarefa encontrada'
            : filter === 'completed'
            ? 'Nenhuma tarefa concluída ainda'
            : activeArea
            ? `Nenhuma tarefa em ${activeArea.name}`
            : 'Nenhuma tarefa cadastrada'}
        </h3>

        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          {searchQuery
            ? 'Tente buscar com outros termos ou limpe o campo de busca.'
            : filter === 'completed'
            ? 'As tarefas que você marcar como concluídas aparecerão aqui.'
            : activeArea
            ? `Adicione sua primeira tarefa de ação para ${activeArea.name} acima.`
            : 'Crie sua primeira tarefa usando o campo acima para ganhar ritmo de ação.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
