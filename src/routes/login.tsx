import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { SECURITY_QUESTIONS, recoveryQuestions, resetWithSecurity, saveSecurity } from "@/lib/security.functions";

export const Route = createFileRoute("/login")({ component: Login });

type Mode = "in" | "up" | "recover";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [q1, setQ1] = useState<string>(SECURITY_QUESTIONS[0]);
  const [q2, setQ2] = useState<string>(SECURITY_QUESTIONS[1]);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [found, setFound] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!authEnabled) return;
    if (password && mode !== "recover" && password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (mode === "up" && password !== confirm) {
      setMessage("Those passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message || "That email or password is wrong.");
        await navigate({ to: "/" });
        return;
      }
      if (mode === "up") {
        const { error } = await authClient.signUp.email({ email, password, name: name.trim() || "Lathos" });
        if (error) throw new Error(error.message || "Could not create the account.");
        await saveSecurity({ data: { items: [
          { question: q1, answer: a1 },
          { question: q2, answer: a2 },
        ] } });
        await navigate({ to: "/account" });
        return;
      }
      if (!found) {
        const result = await recoveryQuestions({ data: email });
        if (result.questions.length !== 2) {
          setMessage("No security questions on that account.");
          return;
        }
        setFound(result.questions);
        return;
      }
      if (password !== confirm) {
        setMessage("Those passwords don't match.");
        return;
      }
      const reset = await resetWithSecurity({ data: { email, answers: [a1, a2], password } });
      // Only claim success when the server confirmed it; a failed call must show its error.
      if (!reset || (reset as { ok?: boolean }).ok !== true) {
        throw new Error("Could not reset the password. Try again in a moment.");
      }
      setFound(null);
      setMode("in");
      setPassword("");
      setConfirm("");
      setMessage("Password updated. Sign in with the new one.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <form className="gate-card" onSubmit={onSubmit}>
        <p className="kicker">Account</p>
        <h1>{mode === "up" ? "Create an account" : mode === "recover" ? "Reset password" : "Sign in"}</h1>
        <p className="lede">
          {mode === "recover"
            ? "Answer the questions you set, then choose a new password."
            : "Email and a password. Two security questions if you ever lock yourself out."}
        </p>
        {!authEnabled ? (
          <p className="gate-note">Sign-in is off.</p>
        ) : (
          <>
            {mode === "up" && (
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={mode === "recover" && !!found}
              />
            </label>
            {mode === "up" && (
              <QuestionFields q1={q1} q2={q2} a1={a1} a2={a2} setQ1={setQ1} setQ2={setQ2} setA1={setA1} setA2={setA2} />
            )}
            {mode === "recover" && found && (
              <>
                <label>
                  {found[0]}
                  <input value={a1} onChange={(e) => setA1(e.target.value)} autoComplete="off" required />
                </label>
                <label>
                  {found[1]}
                  <input value={a2} onChange={(e) => setA2(e.target.value)} autoComplete="off" required />
                </label>
              </>
            )}
            {(mode !== "recover" || found) && (
              <label>
                {mode === "recover" ? "New password" : "Password"}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                />
              </label>
            )}
            {mode !== "in" && (mode !== "recover" || found) && (
              <label>
                Confirm password
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            )}
            {message && <p className="gate-note">{message}</p>}
            <button className="btn btn-cyan" type="submit" disabled={busy}>
              {busy ? "Working…" : mode === "up" ? "Create account" : mode === "recover" ? (found ? "Set new password" : "Show questions") : "Sign in"}
            </button>
          </>
        )}
        <div className="gate-switch">
          {mode !== "in" && (
            <button type="button" onClick={() => { setMode("in"); setFound(null); setMessage(""); }}>
              Sign in
            </button>
          )}
          {mode !== "up" && (
            <button type="button" onClick={() => { setMode("up"); setFound(null); setMessage(""); }}>
              Create account
            </button>
          )}
          {mode !== "recover" && (
            <button type="button" onClick={() => { setMode("recover"); setFound(null); setMessage(""); }}>
              Forgot password
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

function QuestionFields(props: {
  q1: string;
  q2: string;
  a1: string;
  a2: string;
  setQ1: (v: string) => void;
  setQ2: (v: string) => void;
  setA1: (v: string) => void;
  setA2: (v: string) => void;
}) {
  return (
    <>
      <label>
        Security question
        <select value={props.q1} onChange={(e) => props.setQ1(e.target.value)}>
          {SECURITY_QUESTIONS.map((q) => (
            <option key={q} value={q} disabled={q === props.q2}>{q}</option>
          ))}
        </select>
        <input value={props.a1} onChange={(e) => props.setA1(e.target.value)} autoComplete="off" required placeholder="Answer" />
      </label>
      <label>
        Second question
        <select value={props.q2} onChange={(e) => props.setQ2(e.target.value)}>
          {SECURITY_QUESTIONS.map((q) => (
            <option key={q} value={q} disabled={q === props.q1}>{q}</option>
          ))}
        </select>
        <input value={props.a2} onChange={(e) => props.setA2(e.target.value)} autoComplete="off" required placeholder="Answer" />
      </label>
    </>
  );
}
