import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionUser, StaffRole } from "@/types/staff";

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  memberId: number | null;
  login: (user: SessionUser) => void;
  loginWithApi: (user: SessionUser, accessToken: string, refreshToken: string, memberId: number) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

interface PersistedSession {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  memberId: number | null;
}

const STAFF_ROLES: readonly StaffRole[] = ["ADMIN", "RECEPTIONIST", "TECHNICIAN", "MANAGER"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && STAFF_ROLES.some((role) => role === value);
}

function persistableUser(user: SessionUser | null): SessionUser | null {
  if (user === null) {
    return null;
  }
  return {
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    address: user.address,
    workStatus: user.workStatus,
  };
}

function readToken(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function readUser(value: unknown): SessionUser | null {
  if (
    !isRecord(value)
    || typeof value.loginId !== "string"
    || typeof value.name !== "string"
    || typeof value.email !== "string"
    || !isStaffRole(value.role)
  ) {
    return null;
  }
  return {
    loginId: value.loginId,
    name: value.name,
    role: value.role,
    email: value.email,
    phone: typeof value.phone === "string" ? value.phone : "",
    address: typeof value.address === "string" ? value.address : "",
    workStatus: typeof value.workStatus === "string" ? value.workStatus : "",
  };
}

function readPersistedSession(persisted: unknown): PersistedSession {
  if (!isRecord(persisted)) {
    return { user: null, accessToken: null, refreshToken: null, memberId: null };
  }
  const memberId = persisted.memberId;
  return {
    user: readUser(persisted.user),
    accessToken: readToken(persisted.accessToken),
    refreshToken: readToken(persisted.refreshToken),
    memberId: typeof memberId === "number" && Number.isInteger(memberId) && memberId > 0 ? memberId : null,
  };
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      memberId: null,
      // 데모 계정 객체에 비밀번호가 있어도 세션 필드는 복사본만 남긴다.
      login: (user) => set({
        user: persistableUser(user),
        accessToken: null,
        refreshToken: null,
        memberId: null,
      }),
      loginWithApi: (user, accessToken, refreshToken, memberId) => set({
        user: persistableUser(user),
        accessToken,
        refreshToken,
        memberId,
      }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, memberId: null }),
    }),
    {
      name: "fixgo-session",
      partialize: (state) => ({
        user: persistableUser(state.user),
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        memberId: state.memberId,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...readPersistedSession(persistedState),
      }),
      // 복원이 끝난 뒤에 저장소를 다시 쓴다. 예전 세션에 들어 있던 비밀번호 필드를 지운다.
      onRehydrateStorage: () => (state) => {
        if (state === undefined) {
          return;
        }
        queueMicrotask(() => {
          useSessionStore.setState({
            user: persistableUser(state.user),
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
            memberId: state.memberId,
          });
        });
      },
    },
  ),
);
