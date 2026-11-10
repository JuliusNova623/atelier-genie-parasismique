import { create } from 'zustand';
import { builtInContent } from '../content';
import type { Content } from '../content/schema';
import { repo } from '../db/repo';

interface ContentState {
  content: Content;
  loaded: boolean;
  /** Charge le contenu importé (s'il existe), sinon le contenu intégré. */
  load: () => Promise<void>;
}

export const useContent = create<ContentState>((set) => ({
  content: builtInContent,
  loaded: false,
  async load() {
    set({ content: await repo.getContent(), loaded: true });
  },
}));
