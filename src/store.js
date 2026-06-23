import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadSeenItems(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed.seenIds) ? parsed.seenIds : []);
  } catch (error) {
    if (error.code === 'ENOENT') return new Set();
    throw error;
  }
}

export async function saveSeenItems(filePath, seenIds) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    seenIds: [...seenIds].sort()
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
