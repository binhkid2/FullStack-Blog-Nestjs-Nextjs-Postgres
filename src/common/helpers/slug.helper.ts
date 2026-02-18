import { v4 as uuidv4 } from 'uuid';

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);

  const suffix = uuidv4().split('-')[0]; // 8-char UUID segment
  return `${base}-${suffix}`;
}
