import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEMO_USERS, type DemoUser, type Role } from "./permissions";

type Ctx = {
  user: DemoUser | null;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  role: Role | null;
};

const AuthContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "da:auth:user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { username: string };
      const found = DEMO_USERS.find((u) => u.username === parsed.username);
      if (found) setUser(found);
    } catch {
      // ignore
    }
  }, []);

  const login = (username: string, password: string) => {
    const u = DEMO_USERS.find(
      (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
    );
    if (!u) return { ok: false as const, error: "Invalid username or password" };
    setUser(u);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: u.username }));
    return { ok: true as const };
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, role: user?.role ?? null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
