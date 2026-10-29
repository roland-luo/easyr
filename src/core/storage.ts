import type { ProjectDoc } from './types';

const KEY = 'easyv-lite:project:v1';

export function isProjectDoc(value: unknown): value is ProjectDoc {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<ProjectDoc>;
  return (
    doc.version === 1 &&
    typeof doc.name === 'string' &&
    !!doc.canvas &&
    typeof doc.canvas.width === 'number' &&
    typeof doc.canvas.height === 'number' &&
    Array.isArray(doc.rootIds) &&
    !!doc.nodes &&
    typeof doc.nodes === 'object'
  );
}

export function loadSaved(): ProjectDoc | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isProjectDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDoc(doc: ProjectDoc): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    /* 存储配额不足时忽略，编辑不受影响 */
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function safeFileName(name: string): string {
  const trimmed = name.trim() || 'easyv-screen';
  return trimmed.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 60);
}

export function downloadDoc(doc: ProjectDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName(doc.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
