import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import { AreaDocument } from '@/types/productivity';

// Limite máximo de caracteres por documento para manter o LocalStorage e o payload saudáveis
const MAX_CONTENT_LENGTH = 20000;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    let extractedText = '';
    let detectedMimeType = file.type || 'text/plain';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Processamento de PDF via unpdf (compatível com Turbopack e Node.js sem fake worker)
    if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
      detectedMimeType = 'application/pdf';
      try {
        const result = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });
        extractedText = (Array.isArray(result.text) ? result.text.join('\n\n') : result.text || '').trim();
      } catch (pdfErr: any) {
        console.error('Erro na extração do PDF:', pdfErr);
        return NextResponse.json(
          { error: `Falha ao extrair texto do PDF: ${pdfErr?.message || 'Arquivo corrompido ou protegido por senha.'}` },
          { status: 422 }
        );
      }
    }
    // 2. Processamento de DOCX (Word) via mammoth
    else if (
      lowerName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      detectedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch (docErr: any) {
        console.error('Erro na extração do DOCX:', docErr);
        return NextResponse.json(
          { error: `Falha ao extrair texto do arquivo Word (.docx): ${docErr?.message || 'Arquivo corrompido.'}` },
          { status: 422 }
        );
      }
    }
    // 3. Processamento de HTML
    else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm') || file.type === 'text/html') {
      detectedMimeType = 'text/html';
      const rawHtml = buffer.toString('utf-8');
      // Remove tags <script> e <style> volumosas preservando tags estruturais, classes e seletores
      extractedText = rawHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .trim();
    }
    // 4. Processamento de CSS
    else if (lowerName.endsWith('.css') || file.type === 'text/css') {
      detectedMimeType = 'text/css';
      extractedText = buffer.toString('utf-8');
    }
    // 5. Processamento de Markdown, Textos e JSON
    else if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.json') ||
      file.type.startsWith('text/')
    ) {
      detectedMimeType = lowerName.endsWith('.md')
        ? 'text/markdown'
        : lowerName.endsWith('.json')
        ? 'application/json'
        : 'text/plain';
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Formato não suportado. Envie arquivos .pdf, .docx, .html, .css, .txt ou .md.' },
        { status: 400 }
      );
    }

    // Higienização e truncamento de segurança
    extractedText = extractedText.replace(/\u0000/g, '').trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Não foi possível extrair nenhum texto legível deste documento.' },
        { status: 422 }
      );
    }

    if (extractedText.length > MAX_CONTENT_LENGTH) {
      extractedText =
        extractedText.slice(0, MAX_CONTENT_LENGTH) +
        '\n\n[...Conteúdo truncado em 20.000 caracteres para otimização de contexto e armazenamento]';
    }

    const document: AreaDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName,
      fileType: detectedMimeType,
      uploadedAt: new Date().toISOString(),
      contentSnippet: extractedText,
      isActive: true,
      fileSize: file.size,
    };

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Erro no upload de documento:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar documento.' },
      { status: 500 }
    );
  }
}
