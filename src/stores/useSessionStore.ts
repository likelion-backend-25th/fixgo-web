import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionUser } from "@/types/staff";

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  memberId: number | null;
  login: (user: SessionUser) => void;
  loginWithApi: (user: SessionUser, accessToken: string, memberId: number) => void;
  logout: () => void;
  updatePassword: (password: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      memberId: null,
      login: (user) => set({ user, accessToken: null, memberId: null }),
      loginWithApi: (user, accessToken, memberId) => set({ user, accessToken, memberId }),
      logout: () => set({ user: null, accessToken: null, memberId: null }),
      updatePassword: (password) =>
        set((state) => ({
          user: state.user === null ? null : { ...state.user, password },
        })),
    }),
    { name: "fixgo-session" },
  ),
);
