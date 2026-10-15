import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

interface AreaInfo {
  id: string;
  name: string;
  description?: string;
  contextBrainPrompt?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transcript = (body.transcript || '').trim();
    const areas = (body.areas || []) as AreaInfo[];

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcrição de voz não fornecida.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(areas) || areas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma área disponível para roteamento.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ [Voice Router] GEMINI_API_KEY ausente, usando roteamento fallback.');
      return NextResponse.json({
        tasks: [
          {
            title: transcript.slice(0, 60),
            description: transcript,
            areaId: areas[0].id,
            estimatedEffort: '15min',
          },
        ],
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const areasContext = areas
      .map(
        (a, idx) =>
          `[Área ${idx + 1}]:\n- ID: "${a.id}"\n- Nome: "${a.name}"\n- Descrição: "${a.description || ''}"\n- Cérebro de Contexto: "${a.contextBrainPrompt || ''}"`
      )
      .join('\n\n');

    const prompt = `
Você é um despachante de produtividade inteligente de alta precisão.
O usuário gravou um desabafo de voz ("Voice Dump") em Português (PT-BR) contendo uma ou mais tarefas pendentes.

ÁREAS CADASTRADAS NO SISTEMA DO USUÁRIO:
${areasContext}

TRANSCRIÇÃO DE VOZ DO USUÁRIO:
"""
${transcript}
"""

SUA MISSÃO:
1. Analise cuidadosamente a transcrição. O usuário pode ter mencionado apenas uma tarefa ou várias tarefas diferentes misturadas em uma única fala (ex: estudo da faculdade, compras e bug de programação).
2. Divida a fala em TAREFAS INDIVIDUAIS ACIONÁVEIS.
3. Para CADA tarefa identificada:
   - "title": Crie um título claro, conciso e profissional em Português (PT-BR) iniciando por verbo de ação.
   - "description": Detalhes específicos mencionados na fala (ou vazio se o título for autoexplicativo).
   - "areaId": Associe OBRIGATORIAMENTE ao "ID" exato da área mais adequada dentre as listadas acima.
   - "estimatedEffort": Classifique estritamente como um dos valores: "5min", "15min", "30min", "1h+", ou "deep_work".
4. Responda estritamente no formato JSON definido pelo schema.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        tasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Título acionável e objetivo da tarefa em português.',
              },
              description: {
                type: Type.STRING,
                description: 'Detalhes complementares extraídos da fala.',
              },
              areaId: {
                type: Type.STRING,
                description: 'O ID exato da Área correspondente entre as áreas cadastradas.',
              },
              estimatedEffort: {
                type: Type.STRING,
                enum: ['5min', '15min', '30min', '1h+', 'deep_work'],
                description: 'Estimativa de esforço para esta tarefa.',
              },
            },
            required: ['title', 'areaId', 'estimatedEffort'],
          },
        },
      },
      required: ['tasks'],
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    } catch (modelErr) {
      console.warn('⚠️ [Voice Router] Tentando fallback para gemini-2.5-flash:', modelErr);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    }

    const outputText = response.text?.trim() || '{}';
    const parsed = JSON.parse(outputText);

    // Validação dos IDs das áreas mapeadas
    const validAreaIds = new Set(areas.map((a) => a.id));
    const fallbackAreaId = areas[0]?.id || 'area-general';

    const routedTasks = (parsed.tasks || []).map((t: { title: string; description?: string; areaId: string; estimatedEffort?: string }) => ({
      title: t.title?.trim() || 'Nova tarefa de voz',
      description: t.description?.trim() || '',
      areaId: validAreaIds.has(t.areaId) ? t.areaId : fallbackAreaId,
      estimatedEffort: t.estimatedEffort || '15min',
    }));

    return NextResponse.json({ tasks: routedTasks });
  } catch (error) {
    console.error('❌ [Voice Router Error]:', error);
    return NextResponse.json(
      { error: 'Falha ao processar e rotear tarefas por voz.' },
      { status: 500 }
    );
  }
}
