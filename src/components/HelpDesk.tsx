import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { askDesk } from "@/lib/helpdesk.functions";
import { DESK_EMAIL, DESK_LABEL } from "@/lib/helpdesk";

const MAILTO = `mailto:${DESK_EMAIL}?subject=${encodeURIComponent(DESK_LABEL)}`;

export function HelpDesk({ showLink = true }: { showLink?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onAsk(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await askDesk({ data: { name, email, message, company } });
      setAnswer(result.answer);
      if (result.mail === "sent") {
        setStatus(`Sent to ${DESK_LABEL}. The automatic reply is below.`);
        setMessage("");
      } else if (result.mail === "confirm") {
        setStatus(`Check ${DESK_EMAIL} and confirm ${DESK_LABEL} once. Then send this note again.`);
      } else {
        setStatus(result.mail === "busy"
          ? "The inbox is busy. Your mail app has the note ready. Press send there."
          : "Your mail app has the note ready for the desk. Press send there.");
        const href = `mailto:${DESK_EMAIL}?subject=${encodeURIComponent(DESK_LABEL)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
        const link = document.createElement("a");
        link.href = href;
        link.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The desk could not take that note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="letter-box">
      <p className="lede">
        {DESK_LABEL} reads notes for {DESK_EMAIL}. Ask here. An automatic reply shows on this page, and a copy goes to that inbox.
      </p>
      <p className="note">Not financial advice. The desk never asks for a seed phrase.</p>
      <form className="letter-form" onSubmit={onAsk}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@email.com" />
        </label>
        <label>
          Note
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={8} maxLength={2000} rows={5} placeholder="What do you need?" />
        </label>
        <label className="hp">
          Company
          <input value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
        <button className="btn btn-cyan" type="submit" disabled={busy}>{busy ? "Sending" : "Ask the desk"}</button>
      </form>
      {error ? <p className="wallet-error">{error}</p> : null}
      {status ? <p className="gate-note">{status}</p> : null}
      {answer ? (
        <div className="help-answer">
          <p className="kicker desk-label">{DESK_LABEL}</p>
          <p>{answer}</p>
        </div>
      ) : null}
      <p className="note">
        Or write <a href={MAILTO}>{DESK_EMAIL}</a> and put {DESK_LABEL} in the subject.
      </p>
      <div className="desk-facts">
        <div><strong>Buy</strong><span>Flap. The contract ends in 7777.</span></div>
        <div><strong>Wallet</strong><span>Use the contract section. Connect there. Never a seed phrase.</span></div>
        <div><strong>Follow</strong><span>The doors on this site are enough. A follow is the only ask.</span></div>
      </div>
      {showLink ? <p className="note"><Link to="/help">Open the help desk</Link></p> : null}
    </div>
  );
}
