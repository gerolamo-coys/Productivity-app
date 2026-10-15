import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const taskTitle = body.taskTitle || body.title || 'Tarefa';
    const areaName = body.areaName || body.area || 'Geral';
    const contextBrainPrompt = body.contextBrainPrompt || body.context || '';
    const notes = (body.notes || []) as string[];

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ [AI Unstick] GEMINI_API_KEY ausente, usando fallback.');
      return NextResponse.json({
        microAction: `Abra os arquivos de ${areaName} e dedique 2 minutos para ler o primeiro parágrafo de "${taskTitle}".`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const notesSnippet = notes.length > 0 ? `\nNotas e lembretes da Área: ${notes.slice(0, 3).join(' | ')}` : '';

    const prompt = `
O usuário está procrastinando ou travado na tarefa "${taskTitle}" da área "${areaName}".
Cérebro de Contexto da Área: "${contextBrainPrompt}"
${notesSnippet}

Gere UMA ÚNICA micro-ação que leva menos de 2 minutos para fazer agora mesmo, quebrando o atrito inicial (ex: "Abra o editor e crie o arquivo index.html", "Pegue um papel e escreva apenas a primeira fórmula"). Seja direto, encorajador e prático. Retorne apenas uma frase curta em português do Brasil (PT-BR).
`;

    // Tentamos gemini-2.5-flash e fazemos fallback gracioso para gemini-3.8-flash se 2.5 não estiver disponível
    let microActionText = '';

    const callModel = async (modelName: string) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              microAction: {
                type: Type.STRING,
                description: 'Uma única frase curta com micro-ação de 2 minutos para quebrar a procrastinação.',
              },
            },
            required: ['microAction'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return parsed.microAction;
      }
      return null;
    };

    try {
      microActionText = await callModel('gemini-2.5-flash');
    } catch (err: any) {
      console.log('ℹ️ gemini-2.5-flash fallback to gemini-3.8-flash:', err?.message || err);
      try {
        microActionText = await callModel('gemini-3.8-flash');
      } catch (err38: any) {
        console.error('Erro ao chamar Gemini para unstick:', err38);
      }
    }

    if (!microActionText) {
      microActionText = `Abra o seu ambiente de ${areaName} e anote a primeira ação prática de "${taskTitle}".`;
    }

    return NextResponse.json({ microAction: microActionText.trim() });
  } catch (error: any) {
    console.error('Erro na rota /api/ai/unstick:', error);
    return NextResponse.json(
      { microAction: 'Abra os arquivos da tarefa e dedique apenas 2 minutos para começar pelo passo mais fácil.' },
      { status: 200 }
    );
  }
}
