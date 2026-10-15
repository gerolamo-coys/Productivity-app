import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let imageBase64 = (body.imageBase64 || '') as string;
    let mimeType = (body.mimeType || 'image/png') as string;
    const userNote = (body.userNote || '').trim();
    const areaName = body.areaName || 'Geral';
    const contextBrainPrompt = body.contextBrainPrompt || '';

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Nenhuma imagem foi enviada.' },
        { status: 400 }
      );
    }

    // Se a imagem veio como data URL (ex: data:image/png;base64,xxxx)
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      imageBase64 = parts[1];
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ [Image Task] GEMINI_API_KEY ausente.');
      return NextResponse.json({
        title: userNote ? `Tarefa: ${userNote}` : 'Tarefa com captura de imagem',
        description: 'Imagem anexada para revisão manual.',
        suggestedSteps: [
          'Abrir a imagem anexada',
          'Identificar pontos prioritários',
          'Executar resolução',
        ],
        estimatedEffort: '30min',
        keyTips: ['Revise a captura de tela na área de trabalho.'],
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
Você é um assistente de produtividade e desenvolvedor sênior com visão computacional.
O usuário capturou ou colou (Ctrl+V) uma imagem (screenshot de slide, print de código/erro, diagrama ou anotação) na área "${areaName}".

Cérebro de Contexto da Área:
"${contextBrainPrompt}"

${userNote ? `Anotação rápida do usuário sobre a imagem:\n"${userNote}"` : ''}

SUA MISSÃO:
1. Examine a imagem com alta atenção técnica:
   - Se for um slide de aula ou exercício teórico: identifique o tema (ex: Teorema de Laplace, Álgebra, Grafos) e extraia o problema/enunciado central.
   - Se for print de tela de código ou log de erro: identifique a tecnologia, o erro ou o componente visual a ser implementado.
   - Se for print de interface ou design: descreva a tela e os elementos a serem construídos.
2. Formule uma tarefa altamente executável em Português do Brasil (PT-BR):
   - "title": Título conciso, profissional e iniciado por verbo de ação (ex: "Resolver exercícios 4 e 5 sobre Matrizes Inversas", "Corrigir erro de Hydration no componente DatePicker").
   - "description": 1 a 2 frases resumindo o que está na imagem e o que precisa ser feito.
   - "suggestedSteps": Lista de 3 a 4 passos práticos e técnicos para concluir o que a imagem solicita.
   - "estimatedEffort": Classifique estritamente como: "5min", "15min", "30min", "1h+", ou "deep_work".
   - "keyTips": 1 ou 2 dicas técnicas ou atalhos práticos diretamente relacionados ao conteúdo visto na imagem.
3. Responda estritamente no formato JSON estabelecido pelo schema.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título acionável e claro da tarefa baseado no conteúdo da imagem.',
        },
        description: {
          type: Type.STRING,
          description: 'Resumo explicativo do conteúdo da imagem e da meta.',
        },
        suggestedSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Passos práticos para executar ou resolver o que está na imagem.',
        },
        estimatedEffort: {
          type: Type.STRING,
          enum: ['5min', '15min', '30min', '1h+', 'deep_work'],
          description: 'Estimativa de esforço.',
        },
        keyTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Dicas técnicas ou fórmulas observadas na imagem.',
        },
      },
      required: ['title', 'description', 'suggestedSteps', 'estimatedEffort', 'keyTips'],
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    } catch (modelErr) {
      console.warn('⚠️ [Image Task] Fallback para gemini-3.8-flash:', modelErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    }

    const outputText = response.text?.trim() || '{}';
    const parsed = JSON.parse(outputText);

    return NextResponse.json({
      title: parsed.title || 'Tarefa analisada por imagem',
      description: parsed.description || '',
      suggestedSteps: Array.isArray(parsed.suggestedSteps) ? parsed.suggestedSteps : [],
      estimatedEffort: parsed.estimatedEffort || '30min',
      keyTips: Array.isArray(parsed.keyTips) ? parsed.keyTips : [],
    });
  } catch (error) {
    console.error('❌ [Image Task Error]:', error);
    return NextResponse.json(
      { error: 'Falha ao analisar a imagem com a IA.' },
      { status: 500 }
    );
  }
}
