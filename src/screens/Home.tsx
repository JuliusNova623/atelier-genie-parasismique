import { fr } from '../i18n/fr';

export function Home() {
  return (
    <main style={{ padding: 24, textAlign: 'center' }}>
      <h1>{fr.appName}</h1>
      <p>{fr.home.hello}</p>
      <button type="button">{fr.home.newGame}</button>
    </main>
  );
}
