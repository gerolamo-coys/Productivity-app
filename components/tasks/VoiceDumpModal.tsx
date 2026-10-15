'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import {
  Mic,
  MicOff,
  Sparkles,
  RotateCw,
  X,
  Volume2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export function VoiceDumpModal() {
  const {
    areas,
    isVoiceDumpOpen,
    setIsVoiceDumpOpen,
    addTasksFromVoiceDump,
    showToast,
  } = useProductivityStore();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializa o reconhecimento de voz ao abrir ou monta listeners
  useEffect(() => {
    if (!isVoiceDumpOpen) {
      handleStopRecording();
      setTranscript('');
      setErrorMessage(null);
      setSeconds(0);
      return;
    }

    // Auto-inicia gravação ao abrir o modal
    handleStartRecording();

    return () => {
      handleStopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceDumpOpen]);

  // Cronômetro de gravação
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    setErrorMessage(null);

    // Verifica suporte à Web Speech API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Seu navegador não suporta a Web Speech API. Você pode digitar ou colar seu áudio/texto diretamente abaixo.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Permissão do microfone negada. Permita o microfone no navegador.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Erro no reconhecimento: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (err) {
      console.error('Falha ao iniciar SpeechRecognition:', err);
      setErrorMessage('Não foi possível acessar o microfone.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignora se já estiver parado
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleProcessVoiceDump = async () => {
    if (!transcript.trim()) {
      showToast('Fale ou escreva suas tarefas antes de processar.');
      return;
    }

    handleStopRecording();
    setIsProcessing(true);

    try {
      const res = await fetch('/api/ai/voice-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          areas: areas.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            contextBrainPrompt: a.contextBrainPrompt,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao processar o áudio com a IA.');
      }

      const data = await res.json();
      const routedTasks = data.tasks || [];

      if (routedTasks.length === 0) {
        throw new Error('Nenhuma tarefa foi identificada na sua fala.');
      }

      // Adiciona as tarefas no Zustand e Supabase
      addTasksFromVoiceDump(routedTasks);

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback silencioso
      }

      setIsVoiceDumpOpen(false);
    } catch (err: unknown) {
      console.error('Erro ao processar Voice Dump:', err);
      showToast(err instanceof Error ? err.message : 'Erro ao processar fala.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVoiceDumpOpen) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isProcessing && setIsVoiceDumpOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Voice Dump com Roteamento IA
              </h2>
              <p className="text-xs text-neutral-500">
                Fale livremente. O Gemini dividirá e enviará cada tarefa para a sua Área.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !isProcessing && setIsVoiceDumpOpen(false)}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botão de Microfone Central Pulsante */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div className="relative">
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping duration-1000" />
                <span className="absolute -inset-2 rounded-full bg-red-500/10 animate-pulse duration-700" />
              </>
            )}

            <button
              type="button"
              onClick={toggleRecording}
              disabled={isProcessing}
              className={cn(
                'relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer',
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/40 scale-105'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'
              )}
              title={isRecording ? 'Pausar escuta' : 'Começar a falar'}
            >
              {isRecording ? (
                <Mic className="w-8 h-8 animate-pulse" />
              ) : (
                <MicOff className="w-8 h-8 opacity-90" />
              )}
            </button>
          </div>

          <div className="text-center">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                isRecording
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-neutral-400'
                )}
              />
              <span>
                {isRecording
                  ? `Ouvindo... (${formatTimer(seconds)})`
                  : 'Toque no microfone para falar'}
              </span>
            </span>
          </div>
        </div>

        {/* Caixa de Texto da Transcrição */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Transcrição ao Vivo (ou digite seu desabafo):</span>
            </label>
            {transcript && (
              <button
                type="button"
                onClick={() => setTranscript('')}
                className="text-[11px] text-neutral-400 hover:text-red-500 transition cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <textarea
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Exemplo: Preciso resolver a lista de Álgebra Linear sobre Laplace, depois comprar whey protein e ajustar o z-index do modal de agendamento no PodOnly..."
            className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none"
          />
        </div>

        {/* Alerta de Erro ou Suporte */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Rodapé e Ação Principal */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsVoiceDumpOpen(false)}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleProcessVoiceDump}
            disabled={isProcessing || !transcript.trim()}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition cursor-pointer',
              (isProcessing || !transcript.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Roteando com Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Processar & Criar Tarefas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
