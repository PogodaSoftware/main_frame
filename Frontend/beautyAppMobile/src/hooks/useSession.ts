import { useSessionStore } from '@/store/session';

export function useSession() {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const hydrate = useSessionStore((s) => s.hydrate);
  const setUser = useSessionStore((s) => s.setUser);
  const clear = useSessionStore((s) => s.clear);
  return { status, user, hydrate, setUser, clear };
}
