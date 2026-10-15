declare module 'mammoth' {
  export interface RawTextResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(options: { buffer: Buffer }): Promise<RawTextResult>;
  export function convertToHtml(options: { buffer: Buffer }): Promise<{ value: string; messages: any[] }>;
  export function convertToMarkdown(options: { buffer: Buffer }): Promise<{ value: string; messages: any[] }>;
}
