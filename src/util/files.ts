import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Enregistre un fichier texte pour l'utilisateur.
 * - Sur Android (APK) : écrit dans le cache puis ouvre la feuille de partage (Drive, WhatsApp, Fichiers…),
 *   car le téléchargement via un lien <a download> n'est pas pris en charge par la WebView.
 * - Dans un navigateur : téléchargement classique.
 */
export async function saveTextFile(filename: string, text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, files: [written.uri], dialogTitle: filename });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

/** JSON → objet, avec un message d'erreur lisible en français. */
export function parseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Ce texte n'est pas du JSON valide (${detail}).` };
  }
}

export function datedName(prefix: string, now = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}
