import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const content = (body.content || '').trim();
    const areaName = body.areaName || body.area || 'Geral';
    const contextBrainPrompt = body.contextBrainPrompt || body.context || '';

    if (!content) {
      return NextResponse.json(
        { error: 'Conteúdo da nota vazio.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ [AI Polish] GEMINI_API_KEY ausente, retornando texto original.');
      return NextResponse.json({ polishedContent: content });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Você é um refinador de anotações técnicas e organizador de pensamento.
O usuário escreveu o seguinte rascunho rápido na área "${areaName}":

"""
${content}
"""

Cérebro de Contexto da Área:
"${contextBrainPrompt}"

Sua tarefa: Transformar este rascunho em uma anotação impecável, limpa, agradável e de leitura imediata para um post-it/sticky note.

DIRETRIZES DE FORMATAÇÃO:
1. Se houver ideias ou passos soltos, organize em bullet points limpos (•).
2. Se detectar código (HTML, CSS, JS/TS, Python, SQL, etc.), formate em bloco de código Markdown com o identificador da linguagem correto (\`\`\`html, \`\`\`css, \`\`\`python).
3. Se detectar matemática, álgebra ou lógica, formate as fórmulas de maneira elegante, com símbolos matemáticos adequados (≠, ², ·, ∈, →, etc.).
4. Mantenha o tamanho conciso e direto, ideal para uma nota adesiva compacta.
5. NUNCA adicione saudações, introduções ou explicações sobre o que você fez. Retorne apenas o conteúdo refinado.
6. Responda em Português do Brasil (PT-BR).
`;

    let polishedContent = '';

    const callModel = async (modelName: string) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              polishedContent: {
                type: Type.STRING,
                description: 'O texto refinado e estruturado com markdown, tópicos ou blocos de código.',
              },
            },
            required: ['polishedContent'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return parsed.polishedContent;
      }
      return null;
    };

    try {
      polishedContent = await callModel('gemini-3.8-flash');
    } catch (err: any) {
      console.log('ℹ️ gemini-3.8-flash fallback tentativa gemini-2.5-flash:', err?.message || err);
      try {
        polishedContent = await callModel('gemini-2.5-flash');
      } catch (err25: any) {
        console.error('Erro ao chamar Gemini para polish:', err25);
      }
    }

    if (!polishedContent) {
      polishedContent = content;
    }

    return NextResponse.json({ polishedContent: polishedContent.trim() });
  } catch (error: any) {
    console.error('Erro na rota /api/ai/notes/polish:', error);
    return NextResponse.json(
      { error: 'Falha ao processar nota.' },
      { status: 500 }
    );
  }
}
