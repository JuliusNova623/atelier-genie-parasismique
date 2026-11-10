import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../components/ui.module.css';
import { validateContent, type ValidationResult } from '../content/validate';
import { repo } from '../db/repo';
import { fr } from '../i18n/fr';
import { useContent } from '../store/content';
import { useGameStore } from '../store/game';
import { datedName, parseJson, readFileText, saveTextFile } from '../util/files';

/** Importer des cartes : coller du JSON ou charger un fichier, valider, prévisualiser, enregistrer. */
export function ImportScreen() {
  const navigate = useNavigate();
  const t = fr.importPage;
  const current = useContent((s) => s.content);
  const reloadContent = useContent((s) => s.load);
  const gameRunning = useGameStore((s) => !!s.game);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void repo.hasContentOverride().then((v) => alive && setCustom(v));
    return () => {
      alive = false;
    };
  }, []);

  const check = (source: string) => {
    setMessage(null);
    const parsed = parseJson(source);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setResult(null);
      return;
    }
    setParseError(null);
    setResult(validateContent(parsed.value));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await readFileText(file);
    setText(content);
    check(content);
  };

  const save = async () => {
    if (!result?.ok || !result.content || gameRunning) return;
    await repo.setContentOverride(result.content);
    await reloadContent();
    setCustom(true);
    setMessage(t.saved);
  };

  const reset = async () => {
    if (!window.confirm(t.resetConfirm)) return;
    await repo.clearContentOverride();
    await reloadContent();
    setCustom(false);
    setMessage(t.resetDone);
  };

  const exportCurrent = () => saveTextFile(datedName('cartes'), JSON.stringify(current, null, 2));

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          aria-label={fr.common.back}
          onClick={() => navigate('/')}
        >
          ←
        </button>
        <h1>{t.title}</h1>
      </header>

      <section className={styles.section} aria-label={t.current}>
        <h2>{t.current}</h2>
        <p style={{ margin: 0 }}>
          {custom ? t.custom : t.builtIn} · {current.themes.length} thèmes ·{' '}
          {current.themes.reduce((n, th) => n + th.cards.length, 0)} cartes
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={() => void exportCurrent()}>
            {t.export}
          </button>
          {custom && (
            <button type="button" className={styles.btn} onClick={() => void reset()}>
              {t.reset}
            </button>
          )}
        </div>
      </section>

      <section className={styles.section} aria-label={t.title}>
        <p className={styles.hint}>{t.intro}</p>
        <div className={styles.field}>
          <label htmlFor="json-text">{t.paste}</label>
          <textarea
            id="json-text"
            className={styles.input}
            rows={8}
            spellCheck={false}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
              setParseError(null);
            }}
            style={{ fontFamily: 'monospace', minHeight: 160 }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="json-file">{t.file}</label>
          <input
            id="json-file"
            className={styles.input}
            type="file"
            accept=".json,application/json"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!text.trim()}
          onClick={() => check(text)}
        >
          {t.validate}
        </button>

        {parseError && (
          <p className={styles.errors} role="alert">
            {parseError}
          </p>
        )}
        {result && result.errors.length > 0 && (
          <div role="alert">
            <h3>{t.errors}</h3>
            <ul className={styles.errors}>
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {result && result.warnings.length > 0 && (
          <div role="status">
            <h3>{t.warnings}</h3>
            <ul>
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {result?.ok && result.content && (
          <div aria-label={t.preview}>
            <h3>{t.preview}</h3>
            <ul className={styles.ranking}>
              {result.content.themes.map((th) => (
                <li key={th.id} style={{ ['--player-color' as string]: th.color }}>
                  <span aria-hidden="true">{th.emoji}</span>
                  <span className={styles.grow}>
                    <strong>{th.name}</strong>
                    <small className={styles.hint} style={{ display: 'block' }}>
                      {t.cards(th.cards.length)} · {th.cards[0]?.text}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            {gameRunning && (
              <p className={styles.errors} role="alert">
                {t.blocked}
              </p>
            )}
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ marginTop: 12, width: '100%' }}
              disabled={gameRunning}
              onClick={() => void save()}
            >
              {t.save}
            </button>
          </div>
        )}
        {message && (
          <p role="status" style={{ margin: 0, fontWeight: 700 }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
