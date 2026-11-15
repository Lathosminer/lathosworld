import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "@tanstack/react-router";
import { AUDIO_EVENT, claimAudio, type AudioSource } from "@/lib/audio-bus";
import {
  parseIcecastStatus,
  RADIO_POLL_MS,
  RADIO_STATUS_URL,
  RADIO_STREAM_URL,
  RADIO_VOLUME_KEY,
} from "@/lib/radio";

type Phase = "checking" | "live" | "offline";

type RadioContextValue = {
  phase: Phase;
  playing: boolean;
  title: string;
  serverName: string;
  volume: number;
  toggle: () => void;
  setVolume: (value: number) => void;
  setDeckVisible: (id: string, visible: boolean) => void;
};

const RadioContext = createContext<RadioContextValue | null>(null);

function useRadio(): RadioContextValue {
  const value = useContext(RadioContext);
  if (!value) throw new Error("Radio player is outside its provider");
  return value;
}

function stopStream(audio: HTMLAudioElement) {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playingRef = useRef(false);
  const volumeRef = useRef(0.85);
  const ignoreErrorRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("checking");
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState("");
  const [serverName, setServerName] = useState("LathosWorld Radio");
  const [volume, setVolumeState] = useState(0.85);
  const [deckOnScreen, setDeckOnScreen] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const visibleDecks = useRef(new Set<string>());

  const markPlaying = useCallback((on: boolean) => {
    playingRef.current = on;
    setPlaying(on);
  }, []);

  const halt = useCallback(
    (audio: HTMLAudioElement) => {
      ignoreErrorRef.current = true;
      stopStream(audio);
      ignoreErrorRef.current = false;
      markPlaying(false);
    },
    [markPlaying],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RADIO_VOLUME_KEY);
      if (stored == null) return;
      const next = Number(stored);
      if (!Number.isFinite(next)) return;
      const clamped = Math.min(1, Math.max(0, next));
      volumeRef.current = clamped;
      setVolumeState(clamped);
    } catch {
      /* Private browsing can block localStorage. The default volume still works. */
    }
  }, []);

  useEffect(() => {
    const onClaim = (event: Event) => {
      if ((event as CustomEvent<AudioSource>).detail === "radio") return;
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      halt(audio);
    };
    window.addEventListener(AUDIO_EVENT, onClaim);
    return () => window.removeEventListener(AUDIO_EVENT, onClaim);
  }, [halt]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(RADIO_STATUS_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const parsed = parseIcecastStatus(await response.json());
        if (cancelled) return;
        if (parsed.serverName) setServerName(parsed.serverName);
        if (!parsed.online) {
          setPhase("offline");
          setTitle("");
          const audio = audioRef.current;
          if (audio && playingRef.current) halt(audio);
          return;
        }
        setPhase("live");
        setTitle(parsed.title);
      } catch {
        if (cancelled || playingRef.current) return;
        setPhase("offline");
        setTitle("");
      } finally {
        window.clearTimeout(timer);
      }
    };
    void tick();
    const interval = window.setInterval(() => void tick(), RADIO_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [halt]);

  const setDeckVisible = useCallback((id: string, visible: boolean) => {
    const decks = visibleDecks.current;
    if (visible) decks.add(id);
    else decks.delete(id);
    setDeckOnScreen(decks.size > 0);
  }, []);

  const applyVolume = useCallback((next: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.volume = next;
    } catch {
      /* iOS Safari uses the hardware volume and ignores this assignment. */
    }
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const next = Math.min(1, Math.max(0, value));
      volumeRef.current = next;
      setVolumeState(next);
      applyVolume(next);
      try {
        localStorage.setItem(RADIO_VOLUME_KEY, String(next));
      } catch {
        /* The slider still changes this visit. */
      }
    },
    [applyVolume],
  );

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.getAttribute("src") && !audio.paused) {
      halt(audio);
      return;
    }
    claimAudio("radio");
    audio.src = RADIO_STREAM_URL;
    applyVolume(volumeRef.current);
    try {
      await audio.play();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError") return;
      halt(audio);
      setPhase("offline");
    }
  }, [applyVolume, halt]);

  const value = useMemo(
    () => ({
      phase,
      playing,
      title,
      serverName,
      volume,
      toggle,
      setVolume,
      setDeckVisible,
    }),
    [phase, playing, title, serverName, volume, toggle, setVolume, setDeckVisible],
  );

  const showMini = engaged && !deckOnScreen;

  useEffect(() => {
    document.body.classList.toggle("radio-mini-open", showMini);
    return () => document.body.classList.remove("radio-mini-open");
  }, [showMini]);

  return (
    <RadioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        data-radio="live"
        preload="none"
        playsInline
        onPlaying={() => {
          markPlaying(true);
          setEngaged(true);
          setPhase("live");
        }}
        onPause={() => markPlaying(false)}
        onError={() => {
          if (ignoreErrorRef.current) return;
          if (!audioRef.current?.getAttribute("src")) return;
          markPlaying(false);
          setPhase("offline");
        }}
      />
      {showMini ? <RadioMini /> : null}
    </RadioContext.Provider>
  );
}

function useRadioDeck(ref: RefObject<HTMLElement | null>, deckId: string) {
  const { setDeckVisible } = useRadio();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setDeckVisible(deckId, Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.25));
      },
      { threshold: [0, 0.25, 0.6] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setDeckVisible(deckId, false);
    };
  }, [deckId, ref, setDeckVisible]);
}

function VolumeSlider({ id }: { id: string }) {
  const { volume, setVolume } = useRadio();
  const percent = Math.round(volume * 100);
  return (
    <label className="radio-volume" htmlFor={id}>
      <span>Volume</span>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} percent`}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
      />
    </label>
  );
}

function Bolts() {
  return (
    <svg className="radio-bolts" viewBox="0 0 80 140" aria-hidden="true">
      <path d="M46 2 16 58h20L22 138l46-78H46L58 2H46z" />
      <path d="M62 18 48 48h10l-8 28 18-34H58l8-24H62z" />
    </svg>
  );
}

type RadioPlacement = "home" | "lexi" | "page";

const RADIO_PLACEMENT: Record<
  RadioPlacement,
  { titleId: string; volumeId: string; anchorId: string; heading: "h1" | "h3" }
> = {
  home: { titleId: "radio-title", volumeId: "radio-volume-home", anchorId: "radio", heading: "h3" },
  lexi: {
    titleId: "lexi-radio-title",
    volumeId: "radio-volume-lexi",
    anchorId: "radio",
    heading: "h3",
  },
  page: {
    titleId: "radio-page-title",
    volumeId: "radio-volume-page",
    anchorId: "radio",
    heading: "h1",
  },
};

export function RadioListenButton({
  targetId = "radio",
  idleLabel = "Listen on LathosWorld Radio",
  playingLabel = "Pause the station",
}: {
  targetId?: string;
  idleLabel?: string;
  playingLabel?: string;
}) {
  const { playing, toggle } = useRadio();
  return (
    <button
      type="button"
      className="btn btn-cyan"
      onClick={() => {
        void toggle();
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      {playing ? playingLabel : idleLabel}
    </button>
  );
}

export function RadioDeck({ placement = "home" }: { placement?: RadioPlacement }) {
  const radio = useRadio();
  const ref = useRef<HTMLElement>(null);
  const place = RADIO_PLACEMENT[placement];
  useRadioDeck(ref, place.anchorId);
  const TitleTag = place.heading;
  const track = radio.title || radio.serverName;
  return (
    <section ref={ref} className="radio-card" id={place.anchorId} aria-labelledby={place.titleId}>
      <Bolts />
      <p className="kicker">{radio.serverName}</p>
      <TitleTag id={place.titleId}>LathosWorld Radio</TitleTag>
      <p className="radio-now" aria-live="polite">
        {radio.phase === "live" ? (
          <span className="radio-flag is-live">
            <span className="radio-live-dot" aria-hidden="true" />
            LIVE
          </span>
        ) : radio.phase === "offline" ? (
          <span className="radio-flag">Radio offline</span>
        ) : (
          <span className="radio-flag">Checking the station</span>
        )}
        {radio.phase === "live" ? <span className="radio-track">{track}</span> : null}
      </p>
      <div className="radio-controls">
        <button
          type="button"
          className="btn btn-cyan radio-play"
          aria-pressed={radio.playing}
          onClick={() => void radio.toggle()}
        >
          {radio.playing ? "Pause" : "Play"}
        </button>
        <VolumeSlider id={place.volumeId} />
      </div>
      <p className="note radio-jump">
        {placement === "page" ? <Link to="/">Back home</Link> : <Link to="/radio">Open the station</Link>}
      </p>
    </section>
  );
}

function RadioMini() {
  const radio = useRadio();
  const track =
    radio.phase === "offline"
      ? "Radio offline"
      : radio.title || radio.serverName || "LathosWorld Radio";
  return (
    <div className="radio-mini" role="region" aria-label="LathosWorld Radio">
      <button
        type="button"
        className="btn btn-cyan radio-mini-play"
        onClick={() => void radio.toggle()}
      >
        {radio.playing ? "Pause" : "Play"}
      </button>
      {radio.phase === "live" ? (
        <span className="radio-flag is-live">
          <span className="radio-live-dot" aria-hidden="true" />
          LIVE
        </span>
      ) : null}
      <span className="radio-mini-title">{track}</span>
      <VolumeSlider id="radio-volume-mini" />
      <Link to="/radio">Station</Link>
    </div>
  );
}
