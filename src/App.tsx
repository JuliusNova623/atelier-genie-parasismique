import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Announcer } from './components/Announcer';
import { BackButtonHandler } from './components/BackButtonHandler';
import { hideSplash } from './util/native';
import { AboutScreen } from './screens/AboutScreen';
import { DrinksScreen } from './screens/DrinksScreen';
import { EndScreen } from './screens/EndScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { Home } from './screens/Home';
import { ImportScreen } from './screens/ImportScreen';
import { NewGame } from './screens/NewGame';
import { Play } from './screens/Play';
import { Settings } from './screens/Settings';
import { useGameStore } from './store/game';
import { useContent } from './store/content';
import { useSettings } from './store/settings';

export function App() {
  const settingsLoaded = useSettings((s) => s.loaded);
  const gameLoaded = useGameStore((s) => s.loaded);
  const contentLoaded = useContent((s) => s.loaded);

  useEffect(() => {
    void useSettings.getState().load();
    void useGameStore.getState().load();
    void useContent.getState().load();
    // Demande un stockage persistant (évite l'éviction des données par le système).
    void navigator.storage?.persist?.();
  }, []);

  const ready = settingsLoaded && gameLoaded && contentLoaded;
  useEffect(() => {
    if (ready) void hideSplash();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <Announcer />
      <BackButtonHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewGame />} />
        <Route path="/play" element={<Play />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/end/:id" element={<EndScreen />} />
        <Route path="/drinks" element={<DrinksScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/import" element={<ImportScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
