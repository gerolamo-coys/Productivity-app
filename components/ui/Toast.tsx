'use client';

import React from 'react';
import { useProductivityStore } from '@/lib/store/useProductivityStore';
import { AlertCircle, X } from 'lucide-react';

export function Toast() {
  const { toastMessage, hideToast } = useProductivityStore();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl border border-neutral-700/50 dark:border-neutral-200">
        <AlertCircle className="w-4 h-4 text-amber-400 dark:text-amber-600 shrink-0" />
        <p className="text-xs font-medium leading-snug flex-1">
          {toastMessage}
        </p>
        <button
          onClick={hideToast}
          className="p-1 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-white dark:hover:text-neutral-900 transition"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
