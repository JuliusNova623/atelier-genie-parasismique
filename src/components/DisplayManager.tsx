import { useEffect } from 'react';
import { useIsTv } from '../util/display';

/** Pose `data-display="tv|phone"` sur <html> : le CSS « grand écran » s'appuie dessus. */
export function DisplayManager() {
  const tv = useIsTv();
  useEffect(() => {
    document.documentElement.dataset.display = tv ? 'tv' : 'phone';
  }, [tv]);
  return null;
}
