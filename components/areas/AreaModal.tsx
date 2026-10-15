'use client';

import React, { useState, useEffect } from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AreaIcon, AVAILABLE_ICONS } from '@/components/icons/AreaIcon';
import { X, Trash2, Brain, Sparkles } from 'lucide-react';

const COLOR_PALETTE = [
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Âmbar', hex: '#f59e0b' },
  { name: 'Rosa', hex: '#f43f5e' },
  { name: 'Azul Céu', hex: '#0284c7' },
  { name: 'Roxo', hex: '#9333ea' },
  { name: 'Verde Petróleo', hex: '#0d9488' },
  { name: 'Laranja', hex: '#ea580c' },
];

export function AreaModal() {
  const { isAreaModalOpen, closeAreaModal, areaToEdit, addArea, updateArea, deleteArea } =
    useProductivityStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0].hex);
  const [iconName, setIconName] = useState('Folder');
  const [contextBrainPrompt, setContextBrainPrompt] = useState('');

  // Fechar modal ao pressionar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAreaModal();
      }
    };

    if (isAreaModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAreaModalOpen, closeAreaModal]);

  useEffect(() => {
    if (areaToEdit) {
      setName(areaToEdit.name);
      setDescription(areaToEdit.description || '');
      setColor(areaToEdit.color);
      setIconName(areaToEdit.iconName);
      setContextBrainPrompt(areaToEdit.contextBrainPrompt || '');
    } else {
      setName('');
      setDescription('');
      setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].hex);
      setIconName('Folder');
      setContextBrainPrompt('');
    }
  }, [areaToEdit, isAreaModalOpen]);

  if (!isAreaModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (areaToEdit) {
      updateArea(areaToEdit.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        iconName,
        contextBrainPrompt: contextBrainPrompt.trim(),
      });
    } else {
      addArea({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        iconName,
        contextBrainPrompt: contextBrainPrompt.trim(),
      });
    }

    closeAreaModal();
  };

  const handleDelete = () => {
    if (areaToEdit) {
      if (confirm(`Tem certeza de que deseja excluir a área "${areaToEdit.name}" e todas as suas tarefas?`)) {
        deleteArea(areaToEdit.id);
        closeAreaModal();
      }
    }
  };

  return (
    <div
      onClick={closeAreaModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <AreaIcon name={iconName} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {areaToEdit ? 'Editar Área' : 'Criar Nova Área'}
              </h2>
              <p className="text-xs text-neutral-500">
                Organize suas tarefas em categorias dedicadas de vida ou projetos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAreaModal}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nome e Descrição */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Nome da Área *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: FATEC, Pessoal, PodOnly..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Descrição (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivo ou escopo desta área"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          {/* Seleção de Cor */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
              Cor do Tema
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    color === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-neutral-400' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Seleção de Ícone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
              Ícone
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
              {AVAILABLE_ICONS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setIconName(item.name)}
                  className={`p-2 rounded-xl flex items-center justify-center border transition ${
                    iconName === item.name
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                  title={item.label}
                >
                  <AreaIcon name={item.name} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Cérebro de Contexto da Área */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-1.5">
              <Brain className="w-4 h-4 text-indigo-500" />
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-300">
                Cérebro de Contexto da Área (Conhecimento da IA)
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-medium">
                Fase 2
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-2.5">
              Ensine à IA o que esta Área envolve (matérias, ementa, stack tecnológico, regras de negócio ou objetivos). Ao criar uma tarefa, a IA usará este contexto para formular conselhos e passos sob medida.
            </p>
            <textarea
              rows={4}
              value={contextBrainPrompt}
              onChange={(e) => setContextBrainPrompt(e.target.value)}
              placeholder="Ex. para FATEC: 'Disciplinas do curso de TI. Matérias principais: Álgebra Linear, Matemática Discreta, Python, Git. Forneça fórmulas e passos para resolução.'&#10;Ex. para PodOnly: 'Software de gestão clínica para podologia. Foco em formulários clínicos de prontuário, componentes em React e arquitetura web.'"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition text-xs font-mono leading-relaxed resize-none"
            />
          </div>

          {/* Ações do Rodapé */}
          <div className="pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
            {areaToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Área
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeAreaModal}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-xl shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {areaToEdit ? 'Salvar Alterações' : 'Criar Área'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
