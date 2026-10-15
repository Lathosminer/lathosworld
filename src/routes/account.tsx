import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SECURITY_QUESTIONS, mySecurity, saveSecurity } from "@/lib/security.functions";

export const Route = createFileRoute("/account")({ component: Account });

function Account() {
  const { user, isPending } = useCurrentUserState();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [q1, setQ1] = useState<string>(SECURITY_QUESTIONS[0]);
  const [q2, setQ2] = useState<string>(SECURITY_QUESTIONS[1]);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [set, setSet] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    mySecurity()
      .then(setSet)
      .catch(() => setSet([]));
  }, [user]);

  if (isPending) return <main className="gate"><p className="lede">Checking the chair…</p></main>;
  if (!user) return <RedirectToSignIn />;

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (next.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message || "Could not change the password.");
      setCurrent("");
      setNext("");
      setMessage("Password changed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onQuestions(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await saveSecurity({ data: { items: [
        { question: q1, answer: a1 },
        { question: q2, answer: a2 },
      ] } });
      setSet([q1, q2]);
      setA1("");
      setA2("");
      setMessage("Security questions saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate">
      <Link className="brand" to="/">
        <img src="/mark.jpg?v=v10" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <div className="gate-card">
        <p className="kicker">Account</p>
        <h1>{user.displayName || user.primaryEmail || "Your chair"}</h1>
        <p className="lede">{user.primaryEmail}</p>
        <UserButton />
        {set.length > 0 && (
          <ul className="gate-list">
            {set.map((q) => <li key={q}>{q}</li>)}
          </ul>
        )}
        <form onSubmit={onPassword}>
          <h2>Change password</h2>
          <label>
            Current password
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </label>
          <label>
            New password
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          <button className="btn btn-ghost" type="submit" disabled={busy}>Update password</button>
        </form>
        <form onSubmit={onQuestions}>
          <h2>Security questions</h2>
          <label>
            Question
            <select value={q1} onChange={(e) => setQ1(e.target.value)}>
              {SECURITY_QUESTIONS.map((q) => <option key={q} value={q} disabled={q === q2}>{q}</option>)}
            </select>
            <input value={a1} onChange={(e) => setA1(e.target.value)} autoComplete="off" required placeholder="Answer" />
          </label>
          <label>
            Second question
            <select value={q2} onChange={(e) => setQ2(e.target.value)}>
              {SECURITY_QUESTIONS.map((q) => <option key={q} value={q} disabled={q === q1}>{q}</option>)}
            </select>
            <input value={a2} onChange={(e) => setA2(e.target.value)} autoComplete="off" required placeholder="Answer" />
          </label>
          <button className="btn btn-cyan" type="submit" disabled={busy}>Save questions</button>
        </form>
        {message && <p className="gate-note">{message}</p>}
      </div>
    </main>
  );
}
