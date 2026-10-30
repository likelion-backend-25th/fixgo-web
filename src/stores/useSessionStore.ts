import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionUser } from "@/types/staff";

interface SessionState {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
  updatePassword: (password: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      updatePassword: (password) =>
        set((state) => ({
          user: state.user === null ? null : { ...state.user, password },
        })),
    }),
    { name: "fixgo-session" },
  ),
);
