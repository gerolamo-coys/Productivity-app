import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

interface DocumentInput {
  fileName: string;
  contentSnippet: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Aceita ambas as convenções de nomenclatura para evitar incompatibilidades com o Zustand store
    const taskTitle = body.taskTitle || body.title || 'Tarefa sem título';
    const taskDescription = body.taskDescription || body.description || '';
    const areaName = body.areaName || body.area || 'Geral';
    const contextBrainPrompt = body.contextBrainPrompt || body.context || '';
    const documents = (body.documents || []) as DocumentInput[];
    const notes = (body.notes || []) as string[];
    const pauseContext = body.pauseContext;
    const pauseNote = typeof pauseContext === 'string' ? pauseContext : pauseContext?.note;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ [AI Helper] GEMINI_API_KEY ausente em .env.local!');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não encontrada em .env.local. Reinicie o servidor após adicionar a chave.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Monta bloco de documentos de apoio se houver materiais ativos para esta Área
    let documentsContextSection = '';
    if (documents.length > 0) {
      documentsContextSection = `
MATERIAIS E DOCUMENTOS DE REFERÊNCIA DA ÁREA:
${documents
  .map(
    (doc, idx) =>
      `=== DOCUMENTO [${idx + 1}]: "${doc.fileName}" ===\n${doc.contentSnippet}`
  )
  .join('\n\n')}

DIRETRIZES DE GROUNDING NOS MATERIAIS DE APOIO:
- Use os documentos acima como fonte primária de verdade.
- Cite termos técnicos, fórmulas, etapas ou regras contidas nos documentos sempre que aplicável.
- No campo "groundedDocuments", liste exatamente os nomes dos arquivos consultados e utilizados (ex: ${documents.map((d) => `"${d.fileName}"`).join(', ')}).
`;
    }

    // Monta bloco de notas adesivas fixadas no Mural da Área
    let notesContextSection = '';
    if (notes.length > 0) {
      notesContextSection = `
NOTAS ADESIVAS E LEMBRETES FIXADOS NO MURAL DESTA ÁREA:
${notes.map((note, idx) => `• [Nota ${idx + 1}]: "${note}"`).join('\n')}

DIRETRIZES DO MURAL DE NOTAS:
- Considere as anotações, fórmulas e lembretes acima como regras ou preferências rápidas definidas pelo usuário para esta área.
- Se houver fórmulas, convenções ou regras nas notas adesivas, cite-as diretamente nos passos sugeridos ou nas keyTips.
`;
    }

    // Monta bloco de retomada ("Onde parei") se a tarefa estiver pausada
    let pauseContextSection = '';
    if (pauseNote && pauseNote.trim()) {
      pauseContextSection = `
CONTEXTO DE RETOMADA ("ONDE EU PAREI"):
O usuário pausou esta tarefa anteriormente e registrou onde parou:
"${pauseNote.trim()}"

DIRETRIZ DE RETOMADA:
- O usuário já iniciou esta tarefa e deseja continuar a partir de "${pauseNote.trim()}".
- Comece o resumo e os passos sugeridos diretamente a partir desse ponto de continuidade, sem mandar refazer o que já foi feito.
`;
    }

    const prompt = `
Você é um assistente de produtividade e mentor técnico focado em ação prática e objetiva.
O usuário adicionou uma tarefa na área "${areaName}".

Cérebro de Contexto da Área (Context Brain):
"${contextBrainPrompt}"

${documentsContextSection}
${notesContextSection}
${pauseContextSection}

Tarefa do Usuário:
Título: "${taskTitle}"
${taskDescription ? `Detalhes/Descrição: "${taskDescription}"` : ''}

Diretrizes obrigatórias:
- Gere um guia estritamente técnico, prático e focado no tema real da tarefa (ex: se for sobre Matemática Discreta ou Álgebra Linear na FATEC, cite fórmulas e etapas de raciocínio reais; se for sobre o PodOnly, cite código React, formulários de prontuário podológico ou TypeScript; se for pessoal, dê passos operacionais práticos).
- NUNCA use frases genéricas de autoajuda ou clichês vazios.
- Responda OBRIGATORIAMENTE em português do Brasil (PT-BR).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: '1 a 2 frases diretas explicando exatamente o que estudar ou como executar a tarefa na prática em português.',
            },
            suggestedSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 a 4 passos concretos e específicos sobre o tema da tarefa.',
            },
            estimatedEffort: {
              type: Type.STRING,
              enum: ['5min', '15min', '30min', '1h+', 'deep_work'],
              description: 'Estimativa de esforço necessária.',
            },
            keyTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '1 ou 2 dicas técnicas, fórmulas ou atalhos específicos do tema.',
            },
            groundedDocuments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Nomes dos documentos de referência utilizados para formular o guia.',
            },
          },
          required: ['summary', 'suggestedSteps', 'estimatedEffort', 'keyTips'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');

    // Se o modelo não preencheu mas haviam documentos, atribui os nomes dos documentos ativos
    const groundedDocuments =
      data.groundedDocuments && data.groundedDocuments.length > 0
        ? data.groundedDocuments
        : documents.length > 0
        ? documents.map((d) => d.fileName)
        : undefined;

    return NextResponse.json({
      ...data,
      groundedDocuments,
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('❌ [AI Helper Error]:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao gerar guia com IA' },
      { status: 500 }
    );
  }
}
