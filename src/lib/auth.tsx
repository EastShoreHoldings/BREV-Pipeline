// @ts-nocheck
// Auth context + provider + login screen.
// Uses Supabase's magic-link (passwordless email) flow: user types email, gets
// a one-click link, Supabase redirects back, session persists in localStorage.

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for an existing session on mount (persists across tabs + reloads)
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    // 2. Subscribe to future auth state changes (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// -----------------------------------------------------------------------------
// Login screen — shown when user is not authenticated
// -----------------------------------------------------------------------------

const C = {
  navy: "#1B2A4A",
  navyD: "#0f1a30",
  lb: "#D6E4F0",
  bg: "#F5F7FA",
  border: "#E5E7EB",
  sec: "#6B7280",
  pri: "#1F2937",
  accent: "#4A90D9",
  ok: "#10B981",
  bad: "#EF4444",
  gold: "#D97706",
  white: "#FFFFFF",
};
const F = "'Aptos Narrow','Segoe UI',system-ui,sans-serif";

export function LoginScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setStatus("sending");
    setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setStatus("sent"); // shows "check your email" if confirmation is on,
                            // or user is auto-signed-in if confirmation is off
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // on success, AuthProvider's onAuthStateChange picks it up; no need to set status
      }
    } catch (err) {
      setStatus("error");
      setError(err?.message || String(err));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg,${C.navy} 0%,${C.navyD} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: F,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 12,
          padding: "32px 36px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 50px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: C.sec,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Bayou Real Estate Ventures, LLC
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.navy,
            margin: 0,
            marginBottom: 6,
          }}
        >
          Deal Pipeline
        </h1>
        <p style={{ fontSize: 11, color: C.sec, marginBottom: 18, lineHeight: 1.5 }}>
          {mode === "signup"
            ? "Create an account. Your pipeline syncs across every device you sign into."
            : "Sign in to your pipeline. Access any time, any device."}
        </p>

        {status === "sent" && mode === "signup" ? (
          <div
            style={{
              background: "#f0fdf4",
              border: `1px solid ${C.ok}`,
              borderRadius: 8,
              padding: "14px 16px",
              fontSize: 11,
              color: C.ok,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Account created</div>
            <div style={{ color: C.pri }}>
              If your Supabase project requires email confirmation, check{" "}
              <strong>{email}</strong> for a verification link. Otherwise you can
              sign in now.
            </div>
            <button
              type="button"
              onClick={() => { setMode("signin"); setStatus("idle"); setPassword(""); }}
              style={{
                marginTop: 10,
                background: "transparent",
                border: `1px solid ${C.ok}`,
                color: C.ok,
                borderRadius: 5,
                padding: "5px 12px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: F,
              }}
            >
              Go to sign in →
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: C.sec,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "block",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontFamily: F,
                color: C.pri,
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />
            <label
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: C.sec,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Your password"}
              minLength={6}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontFamily: F,
                color: C.pri,
                boxSizing: "border-box",
                marginBottom: 14,
              }}
            />
            <button
              type="submit"
              disabled={status === "sending"}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: status === "sending" ? C.sec : C.navy,
                border: "none",
                borderRadius: 6,
                cursor: status === "sending" ? "wait" : "pointer",
                fontFamily: F,
                letterSpacing: 0.5,
              }}
            >
              {status === "sending"
                ? (mode === "signup" ? "Creating account…" : "Signing in…")
                : (mode === "signup" ? "Create account →" : "Sign in →")}
            </button>
            <div style={{ marginTop: 14, textAlign: "center", fontSize: 10, color: C.sec, fontFamily: F }}>
              {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setStatus("idle"); setError(""); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.accent,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: F,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </div>
            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 10px",
                  background: "#fef2f2",
                  border: `1px solid ${C.bad}`,
                  borderRadius: 5,
                  fontSize: 10,
                  color: C.bad,
                }}
              >
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
