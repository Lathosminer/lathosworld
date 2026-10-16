import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MiniSword } from "@/components/MiniSword";
import { joinLetter, leaveLetter } from "@/lib/newsletter.functions";
import { SOCIALS } from "@/lib/socials";

export function LetterBox({ showLink = true }: { showLink?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wall, setWall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"in" | "out" | "">("");
  const [message, setMessage] = useState("");

  async function onJoin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await joinLetter({ data: { email, name, wall } });
      setDone("in");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add that email.");
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    setBusy(true);
    setMessage("");
    try {
      await leaveLetter({ data: email });
      setDone("out");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove that email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="letter-box">
      <p className="lede">The Official Shit List only points at the doors. I will never ask you for anything but a follow.</p>
      {done === "in" ? (
        <p className="gate-note">You're on The Official Shit List. The doors are on this page.</p>
      ) : done === "out" ? (
        <p className="gate-note">That email is off The Official Shit List.</p>
      ) : (
        <form className="letter-form" onSubmit={onJoin}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="you@email.com"
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={wall} onChange={(event) => setWall(event.target.checked)} />
            <span>Show my name on the survivors wall. My email stays private.</span>
          </label>
          {wall ? (
            <label>
              First name or nickname
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                required
                placeholder="A first name or nickname"
                autoComplete="nickname"
              />
            </label>
          ) : null}
          <button className="btn btn-cyan" type="submit" disabled={busy}><MiniSword />{busy ? "Saving" : "Join The Official Shit List"}</button>
        </form>
      )}
      {message ? <p className="gate-note">{message}</p> : null}
      {done !== "out" && email ? (
        <button className="text-btn" type="button" onClick={onLeave} disabled={busy}>Take this email off</button>
      ) : null}
      <ul className="letter-doors">
        {SOCIALS.map((door) => (
          <li key={door.name}>
            <a href={door.href} target="_blank" rel="noopener noreferrer">
              <strong>{door.name}</strong>
              <span>{door.handle}</span>
            </a>
          </li>
        ))}
      </ul>
      {showLink ? <p className="note"><Link to="/list">Open the list</Link></p> : null}
    </div>
  );
}
