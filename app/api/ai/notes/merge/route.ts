import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const notes = (body.notes || []) as string[];
    const areaName = body.areaName || body.area || 'Geral';
    const contextBrainPrompt = body.contextBrainPrompt || body.context || '';

    if (!Array.isArray(notes) || notes.filter((n) => n.trim()).length < 2) {
      return NextResponse.json(
        { error: 'Envie pelo menos 2 notas com conteúdo para mesclar.' },
        { status: 400 }
      );
    }

    const validNotes = notes.map((n) => n.trim()).filter(Boolean);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ [AI Notes Merge] GEMINI_API_KEY ausente, usando síntese fallback.');
      return NextResponse.json({
        title: `Tarefa sintetizada: ${validNotes[0].slice(0, 45)}...`,
        description: `Consolidação de ${validNotes.length} notas adesivas da área ${areaName}.`,
        subtasks: validNotes.map((n) => n.split('\n')[0].replace(/^[•\-\*]\s*/, '').slice(0, 80)),
        estimatedEffort: '30min',
        keyTips: ['Revise as notas consolidadas nesta tarefa.'],
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Você é um líder técnico e especialista em síntese de produtividade.
O usuário selecionou ${validNotes.length} notas adesivas separadas no mural da área "${areaName}" e deseja unificá-las em UMA ÚNICA TAREFA COMPLETA E EXECUTÁVEL.

Cérebro de Contexto da Área:
"${contextBrainPrompt}"

Notas Selecionadas:
${validNotes.map((note, idx) => `[Nota ${idx + 1}]:\n"""\n${note}\n"""`).join('\n\n')}

SUA MISSÃO:
1. Analise o que essas notas têm em comum (ex: um conjunto de correções de um modal, uma lista de exercícios de Álgebra Linear, um fluxo de UI ou um objetivo pessoal).
2. Crie um "title" claro, profissional e acionável em Português (PT-BR) que resuma a meta central (ex: "Corrigir comportamento e z-index do Modal de Agendamento").
3. Escreva uma "description" concisa de 1 a 2 frases explicando o objetivo da tarefa consolidada.
4. Crie "subtasks" (array de 2 a 5 micro-passos concretos) onde cada item seja uma ação prática derivada diretamente dos pontos de cada nota.
5. Estime o esforço em "estimatedEffort" estritamente como um dos valores: "5min", "15min", "30min", "1h+", ou "deep_work".
6. Adicione 1 a 2 "keyTips" técnicas ou práticas relevantes para a execução desta tarefa.
7. Responda estritamente no formato JSON definido pelo schema.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título conciso e profissional para a tarefa consolidada em português.',
        },
        description: {
          type: Type.STRING,
          description: '1 a 2 frases explicando o objetivo e contexto da tarefa.',
        },
        subtasks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 a 5 subtarefas práticas e executáveis correspondentes às notas.',
        },
        estimatedEffort: {
          type: Type.STRING,
          enum: ['5min', '15min', '30min', '1h+', 'deep_work'],
          description: 'Tempo estimado de execução.',
        },
        keyTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1 ou 2 dicas técnicas ou atalhos práticos.',
        },
      },
      required: ['title', 'description', 'subtasks', 'estimatedEffort'],
    };

    let synthesizedData: any = null;

    const callModel = async (modelName: string) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return null;
    };

    try {
      synthesizedData = await callModel('gemini-3.8-flash');
    } catch (err: any) {
      console.log('ℹ️ gemini-3.8-flash fallback tentativa gemini-2.5-flash:', err?.message || err);
      try {
        synthesizedData = await callModel('gemini-2.5-flash');
      } catch (err25: any) {
        console.error('Erro ao chamar Gemini para merge de notas:', err25);
      }
    }

    if (!synthesizedData || !synthesizedData.title) {
      synthesizedData = {
        title: `Consolidação: ${validNotes[0].slice(0, 45)}`,
        description: `Tarefa unificada a partir de ${validNotes.length} notas adesivas.`,
        subtasks: validNotes.map((n) => n.split('\n')[0].replace(/^[•\-\*]\s*/, '').slice(0, 80)),
        estimatedEffort: '30min',
        keyTips: ['Itens agrupados automaticamente.'],
      };
    }

    return NextResponse.json(synthesizedData);
  } catch (error: any) {
    console.error('Erro na rota /api/ai/notes/merge:', error);
    return NextResponse.json(
      { error: 'Falha ao sintetizar notas em uma tarefa.' },
      { status: 500 }
    );
  }
}
