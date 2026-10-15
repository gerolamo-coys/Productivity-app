'use client';

import React, { useState, useRef } from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import {
  Plus,
  AlignLeft,
  Mic,
  Image as ImageIcon,
  X,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachedImage {
  base64: string;
  mimeType: string;
  name: string;
  previewUrl: string;
}

export function TaskInput() {
  const {
    areas,
    selectedAreaId,
    addTask,
    addTaskFromImage,
    setIsVoiceDumpOpen,
    showToast,
  } = useProductivityStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAreaForNewTask, setSelectedAreaForNewTask] = useState<string>(
    selectedAreaId || (areas.length > 0 ? areas[0].id : '')
  );

  React.useEffect(() => {
    if (selectedAreaId) {
      setSelectedAreaForNewTask(selectedAreaId);
    } else if (areas.length > 0) {
      setSelectedAreaForNewTask(areas[0].id);
    }
  }, [selectedAreaId, areas]);

  const activeArea = areas.find((a) => a.id === selectedAreaForNewTask);

  const handleProcessImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione ou cole um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachedImage({
        base64: result,
        mimeType: file.type || 'image/png',
        name: file.name || 'captura.png',
        previewUrl: result,
      });
      showToast('📸 Imagem anexada! Pressione Enter para a IA analisar.');
    };
    reader.readAsDataURL(file);
  };

  // Suporte a Paste (Ctrl+V) de Screenshots ou Prints da Área de Transferência
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessImageFile(file);
          return;
        }
      }
    }
  };

  // Suporte a Drag & Drop de imagens
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessImageFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaForNewTask) return;

    // Fluxo Multimodal com Imagem Anexada
    if (attachedImage) {
      setIsAnalyzingImage(true);
      try {
        const res = await fetch('/api/ai/image-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: attachedImage.base64,
            mimeType: attachedImage.mimeType,
            userNote: title.trim() || undefined,
            areaName: activeArea?.name || 'Geral',
            contextBrainPrompt: activeArea?.contextBrainPrompt || '',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Falha ao processar imagem.');
        }

        const data = await res.json();

        addTaskFromImage({
          areaId: selectedAreaForNewTask,
          title: data.title,
          description: data.description,
          suggestedSteps: data.suggestedSteps,
          estimatedEffort: data.estimatedEffort,
          keyTips: data.keyTips,
        });

        setTitle('');
        setDescription('');
        setAttachedImage(null);
        setShowDescription(false);
      } catch (err: unknown) {
        console.error('Falha ao processar captura por imagem:', err);
        showToast(err instanceof Error ? err.message : 'Erro ao processar imagem.');
      } finally {
        setIsAnalyzingImage(false);
      }
      return;
    }

    // Fluxo Padrão de Tarefa Textual
    if (!title.trim()) return;

    addTask({
      areaId: selectedAreaForNewTask,
      title: title.trim(),
      description: description.trim() || undefined,
    });

    setTitle('');
    setDescription('');
    setShowDescription(false);
  };

  const getPlaceholder = () => {
    if (attachedImage) {
      return 'Adicione uma anotação sobre a imagem (opcional) e pressione Enter...';
    }
    if (selectedAreaId && activeArea) {
      return `Adicionar tarefa em ${activeArea.name}... (Ctrl+K para focar, Ctrl+V para print)`;
    }
    return 'Adicione uma nova tarefa de ação... (Ctrl+K para focar, Ctrl+V para colar imagem)';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'bg-white dark:bg-neutral-900 border rounded-2xl shadow-sm p-3.5 mb-6 transition-all duration-200',
        isDraggingOver
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20'
          : 'border-neutral-200/90 dark:border-neutral-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500'
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Seletor Rápido de Área */}
          <div className="relative shrink-0">
            <select
              value={selectedAreaForNewTask}
              onChange={(e) => setSelectedAreaForNewTask(e.target.value)}
              disabled={isAnalyzingImage}
              className="appearance-none pl-8 pr-6 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition disabled:opacity-50"
              title="Selecione a Área de destino"
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {activeArea && (
              <div
                className="w-2.5 h-2.5 rounded-full absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ backgroundColor: activeArea.color }}
              />
            )}
          </div>

          {/* Campo de Entrada Principal com Suporte a Paste de Screenshot */}
          <input
            id="global-task-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onPaste={handlePaste}
            disabled={isAnalyzingImage}
            placeholder={getPlaceholder()}
            className="flex-1 min-w-[200px] bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden disabled:opacity-50"
          />

          {/* Ferramentas de Entrada: Anexar Imagem + Voice Dump + Descrição */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {/* Input Oculto de Arquivo de Imagem */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessImageFile(e.target.files[0]);
                }
              }}
            />

            {/* Botão de Anexo de Imagem (ou Print) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzingImage}
              className={cn(
                'p-2 rounded-xl transition cursor-pointer',
                attachedImage
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
              title="Anexar imagem, slide ou print (ou cole com Ctrl+V)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Botão de Gravação de Voz (Voice Dump) */}
            <button
              type="button"
              onClick={() => setIsVoiceDumpOpen(true)}
              disabled={isAnalyzingImage}
              className="p-2 rounded-xl text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
              title="Gravar tarefas por voz (Ctrl+Shift+V)"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Alternador de Descrição Textual */}
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              disabled={isAnalyzingImage}
              className={cn(
                'p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer',
                showDescription &&
                  'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
              )}
              title="Adicionar anotação ou detalhes"
            >
              <AlignLeft className="w-4 h-4" />
            </button>

            {/* Botão de Envio / Criação */}
            <button
              type="submit"
              disabled={isAnalyzingImage || (!title.trim() && !attachedImage)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-white text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
            >
              {isAnalyzingImage ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Analisando...</span>
                </>
              ) : attachedImage ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Criar com IA</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Adicionar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Thumbnail Preview da Imagem Anexada */}
        {attachedImage && (
          <div className="pt-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
            <div className="relative group shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImage.previewUrl}
                alt="Preview da captura"
                className="w-12 h-12 object-cover rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-xs cursor-pointer"
                title="Remover imagem"
              >
                <X className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                📷 {attachedImage.name}
              </span>
              <span className="text-[11px] text-neutral-400 block">
                O Gemini 2.5 Flash examinará o print para formular título, resumo e checklist.
              </span>
            </div>
          </div>
        )}

        {/* Campo de Descrição Expansível */}
        {showDescription && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 animate-in fade-in duration-150">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione contexto opcional ou anotações para esta tarefa..."
              className="w-full text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 bg-transparent resize-none focus:outline-hidden"
            />
          </div>
        )}
      </form>
    </div>
  );
}
