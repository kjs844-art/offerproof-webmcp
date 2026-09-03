export const SOURCE_FILE_ACCEPT = '.txt,.md,.eml';
export const MAX_SOURCE_FILE_BYTES = 1024 * 1024;
export const MAX_SOURCE_CHARACTERS = 50_000;

export type SourceFileKind = 'text' | 'markdown' | 'email';

export type SourceFileErrorCode =
  | 'unsupported-type'
  | 'file-too-large'
  | 'empty-file'
  | 'text-too-long'
  | 'binary-file'
  | 'email-format-unsupported'
  | 'read-failed';

export interface ImportedSourceMeta {
  name: string;
  kind: SourceFileKind;
  size: number;
}

export interface ImportedSource {
  text: string;
  meta: ImportedSourceMeta;
}

export class SourceFileError extends Error {
  readonly code: SourceFileErrorCode;

  constructor(code: SourceFileErrorCode) {
    super(code);
    this.name = 'SourceFileError';
    this.code = code;
  }
}

export function sourceFileKind(filename: string): SourceFileKind | null {
  const extension = filename.trim().toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension === '.txt') return 'text';
  if (extension === '.md') return 'markdown';
  if (extension === '.eml') return 'email';
  return null;
}

export function normalizeImportedSourceText(raw: string, kind: SourceFileKind): string {
  const sample = raw.slice(0, 4096);
  const binaryControlCharacters = [...sample].filter((character) => {
    const code = character.charCodeAt(0);
    return code === 0 || (code < 9) || (code > 13 && code < 32);
  }).length;
  if (binaryControlCharacters > 0) throw new SourceFileError('binary-file');

  const normalized = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();

  if (kind !== 'email') return normalized;

  const headerEnd = normalized.indexOf('\n\n');
  if (headerEnd < 0) return normalized;

  const headers = normalized.slice(0, headerEnd).replace(/\n[ \t]+/g, ' ');
  const contentType = headers.match(/^Content-Type:\s*(.+)$/im)?.[1]?.toLowerCase() ?? 'text/plain';
  const transferEncoding = headers.match(/^Content-Transfer-Encoding:\s*(.+)$/im)?.[1]?.toLowerCase() ?? '7bit';
  if (contentType.includes('multipart/') || !contentType.includes('text/plain')) {
    throw new SourceFileError('email-format-unsupported');
  }
  if (transferEncoding.includes('base64') || transferEncoding.includes('quoted-printable')) {
    throw new SourceFileError('email-format-unsupported');
  }
  const subject = headers.match(/^Subject:\s*(.+)$/im)?.[1]?.trim();
  const body = normalized.slice(headerEnd + 2).trim();

  // Transport headers are omitted so From/To addresses are not copied into the review by default.
  // Only simple text/plain email bodies are accepted; HTML, MIME parts, and attachments are ignored.
  return [subject ? `Subject: ${subject}` : '', body].filter(Boolean).join('\n\n');
}

export async function readSourceFile(file: File): Promise<ImportedSource> {
  const kind = sourceFileKind(file.name);
  if (!kind) throw new SourceFileError('unsupported-type');
  if (file.size > MAX_SOURCE_FILE_BYTES) throw new SourceFileError('file-too-large');

  try {
    const text = normalizeImportedSourceText(await file.text(), kind);
    if (!text) throw new SourceFileError('empty-file');
    if (text.length > MAX_SOURCE_CHARACTERS) throw new SourceFileError('text-too-long');
    return { text, meta: { name: file.name, kind, size: file.size } };
  } catch (error) {
    if (error instanceof SourceFileError) throw error;
    throw new SourceFileError('read-failed');
  }
}
