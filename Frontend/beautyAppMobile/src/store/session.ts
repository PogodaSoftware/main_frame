import { create } from 'zustand';

import type { UserType, MeResponse } from '@/services/auth';
import { me as fetchMe } from '@/services/auth';

export type SessionStatus = 'unknown' | 'guest' | UserType;

interface SessionState {
  status: SessionStatus;
  user: MeResponse | null;
  hydrate: () => Promise<void>;
  setUser: (user: MeResponse) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'unknown',
  user: null,
  hydrate: async () => {
    const user = await fetchMe();
    if (user) {
      set({ status: user.user_type, user });
    } else {
      set({ status: 'guest', user: null });
    }
  },
  setUser: (user) => set({ status: user.user_type, user }),
  clear: () => set({ status: 'guest', user: null }),
}));
