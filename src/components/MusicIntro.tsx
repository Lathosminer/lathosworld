import { RadioListenButton } from "@/components/RadioPlayer";

export function MusicIntro() {
  return (
    <section className="hero music-intro" aria-labelledby="intro-title">
      <div className="hero-copy">
        <img
          className="music-intro-mark"
          src="/mark-sm.webp"
          width={72}
          height={72}
          alt=""
          decoding="async"
        />
        <p className="kicker">LathosWorld</p>
        <h2 id="intro-title" className="sell-line">
          Radio is live.
        </h2>
        <div className="cta-row">
          <RadioListenButton targetId="radio" />
          <a className="btn btn-ghost" href="#lexi">
            Lexi's songs
          </a>
        </div>
      </div>
    </section>
  );
}
