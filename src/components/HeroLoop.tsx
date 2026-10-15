import { useEffect, useRef, useState } from "react";

const FADE_SEC = 2;
const HERO_VISIBLE = 0.4;

type Bed = {
  ctx: AudioContext;
  heroGain: GainNode;
  calmGain: GainNode;
};

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.2L12 5v14l-4.8-4.5H4v-5z" />
      {on ? (
        <>
          <path d="M15.5 9.2a4.2 4.2 0 0 1 0 5.6" />
          <path d="M17.8 7a7 7 0 0 1 0 10" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}

function snap(bed: Bed, heroOn: boolean) {
  const now = bed.ctx.currentTime;
  const hero = heroOn ? 1 : 0;
  const calm = heroOn ? 0 : 1;
  bed.heroGain.gain.cancelScheduledValues(now);
  bed.calmGain.gain.cancelScheduledValues(now);
  bed.heroGain.gain.setValueAtTime(hero, now);
  bed.calmGain.gain.setValueAtTime(calm, now);
}

function crossfade(bed: Bed, heroOn: boolean) {
  const now = bed.ctx.currentTime;
  const ramp = (gain: GainNode, target: number) => {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(target, now + FADE_SEC);
  };
  ramp(bed.heroGain, heroOn ? 1 : 0);
  ramp(bed.calmGain, heroOn ? 0 : 1);
}

export function HeroLoop() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLAudioElement>(null);
  const calmRef = useRef<HTMLAudioElement>(null);
  const bedRef = useRef<Bed | null>(null);
  const soundRef = useRef(false);
  const heroOnRef = useRef(true);
  const calmOkRef = useRef(true);
  const [sound, setSound] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const still = mq.matches;
      setReduced(still);
      if (!video) return;
      if (still) {
        video.autoplay = false;
        video.pause();
      } else void video.play().catch(() => {});
    };
    const blockAutoplay = () => {
      if (!mq.matches || !video) return;
      video.pause();
    };
    apply();
    video?.addEventListener("play", blockAutoplay);
    mq.addEventListener("change", apply);
    return () => {
      video?.removeEventListener("play", blockAutoplay);
      mq.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const heroOn = entry.intersectionRatio >= HERO_VISIBLE;
        if (heroOn === heroOnRef.current) return;
        heroOnRef.current = heroOn;
        const bed = bedRef.current;
        const hero = heroRef.current;
        const calm = calmRef.current;
        if (!bed || !soundRef.current || document.hidden || !hero || !calm) return;
        if (!calmOkRef.current) {
          snap(bed, true);
          if (hero.paused) void hero.play().catch(() => {});
          return;
        }
        crossfade(bed, heroOn);
        if (hero.paused) void hero.play().catch(() => {});
        if (calm.paused) void calm.play().catch(() => { calmOkRef.current = false; });
      },
      { threshold: [HERO_VISIBLE] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onHide = () => {
      const hero = heroRef.current;
      const calm = calmRef.current;
      const bed = bedRef.current;
      if (document.hidden) {
        hero?.pause();
        calm?.pause();
        return;
      }
      if (!soundRef.current || !bed || !hero || !calm) return;
      snap(bed, calmOkRef.current ? heroOnRef.current : true);
      void bed.ctx.resume();
      void hero.play().catch(() => {
        soundRef.current = false;
        setSound(false);
        hero.pause();
        calm.pause();
      });
      void calm.play().catch(() => {
        calmOkRef.current = false;
        if (bedRef.current && soundRef.current) snap(bedRef.current, true);
      });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      heroRef.current?.pause();
      calmRef.current?.pause();
      void bedRef.current?.ctx.close();
      bedRef.current = null;
    };
  }, []);

  const ensureBed = () => {
    if (bedRef.current) return bedRef.current;
    const hero = heroRef.current;
    const calm = calmRef.current;
    if (!hero || !calm) return null;
    const ctx = new AudioContext();
    const heroGain = ctx.createGain();
    const calmGain = ctx.createGain();
    heroGain.gain.value = 0;
    calmGain.gain.value = 0;
    ctx.createMediaElementSource(hero).connect(heroGain).connect(ctx.destination);
    ctx.createMediaElementSource(calm).connect(calmGain).connect(ctx.destination);
    const bed = { ctx, heroGain, calmGain };
    bedRef.current = bed;
    return bed;
  };

  const toggleSound = () => {
    const hero = heroRef.current;
    const calm = calmRef.current;
    if (!hero || !calm) return;
    if (soundRef.current) {
      soundRef.current = false;
      setSound(false);
      hero.pause();
      calm.pause();
      if (bedRef.current) snap(bedRef.current, true);
      return;
    }
    const bed = ensureBed();
    if (!bed) return;
    soundRef.current = true;
    setSound(true);
    snap(bed, heroOnRef.current);
    void bed.ctx.resume();
    void hero.play().then(() => {
      if (!soundRef.current) {
        hero.pause();
        calm.pause();
        return;
      }
      if (bedRef.current) snap(bedRef.current, heroOnRef.current);
    }).catch(() => {
      soundRef.current = false;
      setSound(false);
      hero.pause();
      calm.pause();
    });
    calmOkRef.current = true;
    void calm.play().catch(() => {
      calmOkRef.current = false;
      if (bedRef.current && soundRef.current) snap(bedRef.current, true);
    });
  };

  const soundLabel = sound ? "Sound off" : "Sound on";

  return (
    <section ref={sectionRef} className="hero-loop" aria-label="Animated LathosWorld">
      <div className="hero-loop-frame">
        {reduced ? null : (
          <video
            ref={videoRef}
            className="hero-loop-motion"
            autoPlay
            muted
            loop
            playsInline
            poster="/hero-poster.jpg"
            width={1080}
            height={1080}
            preload="metadata"
          >
            <source src="/hero-loop.webm" type="video/webm" />
            <source src="/hero-loop.mp4" type="video/mp4" />
          </video>
        )}
        <img className="hero-loop-still" src="/hero-poster.jpg" width={1080} height={1080} alt="" />
      </div>
      <button
        type="button"
        className="hero-sound"
        aria-pressed={sound}
        aria-label={soundLabel}
        onClick={toggleSound}
      >
        <SpeakerIcon on={sound} />
        <span>{soundLabel}</span>
      </button>
      <audio ref={heroRef} src="/hero-audio.mp3" loop preload="none" />
      <audio ref={calmRef} src="/calm-audio.mp3" loop preload="none" />
    </section>
  );
}
