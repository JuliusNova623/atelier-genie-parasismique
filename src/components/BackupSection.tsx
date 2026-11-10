import { useRef, useState } from 'react';
import { checkBackup, exportBackup, importBackup } from '../db/backup';
import { fr } from '../i18n/fr';
import { useContent } from '../store/content';
import { useGameStore } from '../store/game';
import { useSettings } from '../store/settings';
import { datedName, parseJson, readFileText, saveTextFile } from '../util/files';
import styles from './ui.module.css';

/** Export / import de toutes les données (JSON) : sauvegarde manuelle avant une désinstallation. */
export function BackupSection() {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const t = fr.backup;

  const doExport = async () => {
    setErrors([]);
    await saveTextFile(datedName('sauvegarde'), JSON.stringify(await exportBackup(), null, 2));
    setMessage(t.exportDone);
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    const parsed = parseJson(await readFileText(file));
    if (!parsed.ok) return setErrors([parsed.error]);
    const check = checkBackup(parsed.value);
    if (!check.ok) return setErrors(check.errors);
    setErrors([]);
    if (!window.confirm(t.importConfirm(check.summary.games))) return;
    await importBackup(check.backup);
    await Promise.all([
      useSettings.getState().load(),
      useGameStore.getState().load(),
      useContent.getState().load(),
    ]);
    setMessage(t.importDone);
  };

  return (
    <>
      <p className={styles.hint}>{t.hint}</p>
      <div className={styles.row}>
        <button type="button" className={styles.btn} onClick={() => void doExport()}>
          {t.export}
        </button>
        <button type="button" className={styles.btn} onClick={() => input.current?.click()}>
          {t.import}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="backup-file"
          onChange={(e) => {
            void doImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {errors.length > 0 && (
        <ul className={styles.errors} role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {message && (
        <p role="status" style={{ margin: 0, fontWeight: 700 }}>
          {message}
        </p>
      )}
    </>
  );
}
