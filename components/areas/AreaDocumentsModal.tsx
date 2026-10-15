'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  FileCode,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AreaDocument } from '@/types/productivity';
import { cn } from '@/lib/utils';

function getDocumentBadgeInfo(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return {
      label: 'PDF',
      bgIcon: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
      badge: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900',
      icon: FileText,
    };
  }
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    return {
      label: 'DOCX',
      bgIcon: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
      icon: FileText,
    };
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return {
      label: 'HTML',
      bgIcon: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
      icon: FileCode,
    };
  }
  if (lower.endsWith('.css')) {
    return {
      label: 'CSS',
      bgIcon: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
      badge: 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900',
      icon: FileCode,
    };
  }
  if (lower.endsWith('.md')) {
    return {
      label: 'MD',
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      icon: FileCode,
    };
  }
  return {
    label: 'TXT',
    bgIcon: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    badge: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
    icon: FileText,
  };
}

export function AreaDocumentsModal() {
  const {
    areas,
    isDocumentsModalOpen,
    activeDocumentsAreaId,
    closeDocumentsModal,
    addDocumentToArea,
    toggleDocumentActive,
    removeDocumentFromArea,
  } = useProductivityStore();

  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza a área ativa com o modal
  useEffect(() => {
    if (activeDocumentsAreaId) {
      setSelectedAreaId(activeDocumentsAreaId);
    } else if (areas.length > 0 && !selectedAreaId) {
      setSelectedAreaId(areas[0].id);
    }
  }, [activeDocumentsAreaId, areas, selectedAreaId]);

  // Listener para fechar com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDocumentsModal();
      }
    };
    if (isDocumentsModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDocumentsModalOpen, closeDocumentsModal]);

  if (!isDocumentsModalOpen) return null;

  const currentArea = areas.find((a) => a.id === selectedAreaId) || areas[0];
  const areaDocs = currentArea?.documents || [];
  const activeCount = areaDocs.filter((d) => d.isActive).length;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentArea) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('areaId', currentArea.id);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erro ao processar ${file.name}`);
        }

        const doc = (await res.json()) as AreaDocument;
        addDocumentToArea(currentArea.id, doc);
      }
    } catch (err: any) {
      console.error('Falha no upload:', err);
      setUploadError(err?.message || 'Falha ao fazer upload do documento.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={closeDocumentsModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: currentArea?.color || '#6366f1' }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Materiais de Apoio da Área
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/50 dark:border-indigo-800/40">
                  Grounding de IA
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Arquivos enviados aqui fundamentam automaticamente todas as tarefas criadas nesta Área
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDocumentsModal}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Área */}
        <div className="px-6 py-3 bg-neutral-50/80 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Área Selecionada:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedAreaId(area.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition border',
                    selectedAreaId === area.id
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs border-neutral-300 dark:border-neutral-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: area.color }}
                  />
                  <span>{area.name}</span>
                  <span className="text-[10px] font-mono opacity-70">
                    ({area.documents?.length || 0})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <span className="text-[11px] font-mono text-neutral-500 font-medium">
            {activeCount} de {areaDocs.length} ativos
          </span>
        </div>

        {/* Conteúdo Principal com Rolagem */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Alerta de Erro */}
          {uploadError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Erro no arquivo:</span> {uploadError}
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zona de Drop / Upload */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 group',
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/60 dark:hover:bg-neutral-850/40'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.html,.css,.txt,.md,.json"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Extraindo texto e estrutura do arquivo...
                </span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Clique para selecionar ou arraste arquivos aqui
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Suporta PDF, DOCX, HTML, CSS, TXT e MD
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Lista de Documentos da Área */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Documentos de Referência ({areaDocs.length})
            </h3>

            {areaDocs.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/40 dark:bg-neutral-900/20">
                <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Nenhum material adicionado a {currentArea?.name} ainda
                </p>
                <p className="text-[11px] text-neutral-400 max-w-sm mx-auto mt-1">
                  Envie apostilas em PDF, anotações Word (.docx), arquivos HTML/CSS ou notas em Markdown. Todas as tarefas desta área usarão esses materiais como referência técnica.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {areaDocs.map((doc) => {
                  const isExpanded = expandedDocId === doc.id;
                  const badgeInfo = getDocumentBadgeInfo(doc.fileName);
                  const IconComp = badgeInfo.icon;

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        'border rounded-2xl transition overflow-hidden bg-white dark:bg-neutral-850',
                        doc.isActive
                          ? 'border-neutral-200/90 dark:border-neutral-700/80'
                          : 'border-neutral-200/50 dark:border-neutral-800/60 opacity-60'
                      )}
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        {/* Ícone e Nome */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                              badgeInfo.bgIcon
                            )}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                                {doc.fileName}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border shrink-0',
                                  badgeInfo.badge
                                )}
                              >
                                {badgeInfo.label}
                              </span>
                              {doc.isActive ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                  Ativo
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-medium shrink-0">
                                  Ignorado
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              {formatFileSize(doc.fileSize)} •{' '}
                              {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        {/* Ações: Toggle Ativo, Ver Texto, Excluir */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Toggle Ativo */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleDocumentActive(currentArea.id, doc.id)
                            }
                            className={cn(
                              'px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition',
                              doc.isActive
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:text-neutral-900'
                            )}
                            title={
                              doc.isActive
                                ? 'Clique para desativar este documento da IA'
                                : 'Clique para ativar este documento para a IA'
                            }
                          >
                            {doc.isActive ? 'Em uso' : 'Pausado'}
                          </button>

                          {/* Ver prévia do texto */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDocId(isExpanded ? null : doc.id)
                            }
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                            title="Ver conteúdo extraído"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Remover o material "${doc.fileName}" de ${currentArea.name}?`
                                )
                              ) {
                                removeDocumentFromArea(currentArea.id, doc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                            title="Excluir documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Prévia Expansível do Conteúdo Extraído */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between my-1.5 text-[11px] text-neutral-400">
                            <span className="font-semibold uppercase tracking-wider">
                              Conteúdo Extraído ({doc.contentSnippet.length} caracteres)
                            </span>
                            <span className="font-mono">Fonte de Grounding</span>
                          </div>
                          <pre className="text-xs text-neutral-700 dark:text-neutral-300 font-mono leading-relaxed bg-white dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {doc.contentSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>A IA consulta apenas os documentos marcados como &quot;Em uso&quot;.</span>
          </div>
          <button
            type="button"
            onClick={closeDocumentsModal}
            className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-xl shadow-sm transition"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
