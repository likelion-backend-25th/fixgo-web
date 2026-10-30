import { useSyncExternalStore } from "react";
import { useSessionStore } from "@/stores/useSessionStore";

export function useHydratedSession() {
  const user = useSessionStore((state) => state.user);
  const ready = useSyncExternalStore(
    (onStoreChange) => useSessionStore.persist.onFinishHydration(onStoreChange),
    () => useSessionStore.persist.hasHydrated(),
    () => false,
  );
  return { user, ready };
}
