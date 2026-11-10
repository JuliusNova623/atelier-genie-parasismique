import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './screens/Home';
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

  if (!settingsLoaded || !gameLoaded || !contentLoaded) return null;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<NewGame />} />
      <Route path="/play" element={<Play />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
