import { App as CapApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { useGameStore } from '../store/game';
import { resolveBack, runBackHandlers } from '../util/back';

/** Bouton retour Android : retour logique, ou confirmation avant de quitter une partie en cours. */
export function BackButtonHandler() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const running = useGameStore((s) => !!s.game);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let handle: PluginListenerHandle | undefined;
    void CapApp.addListener('backButton', () => {
      if (runBackHandlers()) return;
      const action = resolveBack(pathname, running);
      if (action === 'go-home') navigate('/', { replace: true });
      else if (action === 'confirm-quit') {
        // La partie est déjà sauvegardée à chaque action : « pause » = simple fermeture.
        if (window.confirm(fr.back.pauseQuit)) void CapApp.exitApp();
      } else void CapApp.exitApp();
    }).then((h) => {
      if (cancelled) void h.remove();
      else handle = h;
    });
    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, [pathname, running, navigate]);

  return null;
}
