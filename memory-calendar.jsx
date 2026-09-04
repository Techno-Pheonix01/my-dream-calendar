import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Phase 1 — local browser only. No Supabase, no auth, no database, no deploy.
// Photos: real File objects via object URLs. Voice: real MediaRecorder audio.
// ---------------------------------------------------------------------------

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const MOODS = {
  joy: "#C9A227",
  cozy: "#A5502D",
  calm: "#7C93A8",
  proud: "#66705A",
  warm: "#B49A63",
  reflective: "#9B8B8F",
};

function getSeason(monthIndex) {
  if ([2, 3, 4].includes(monthIndex)) return "spring";
  if ([5, 6, 7].includes(monthIndex)) return "summer";
  if ([8, 9, 10].includes(monthIndex)) return "autumn";
  return "winter";
}

// Antique-editorial palette. Dark espresso base per season, tinted toward
// that season's mood, with a warm paper tone for the opened journal page.
const SEASONS = {
  spring: {
    label: "Spring",
    bg: "radial-gradient(120% 140% at 20% 0%, #2A2B22 0%, #1C1B15 55%, #131210 100%)",
    accent: "#9BA58C",
    accent2: "#C9A6A0",
    paper: "#F7F1E4",
    symbols: ["🌸", "🌿"],
    flora: ["🌸", "🌷", "🌿"],
    kind: "fall",
  },
  summer: {
    label: "Summer",
    bg: "radial-gradient(120% 140% at 20% 0%, #2A2A1C 0%, #1C1B12 55%, #121109 100%)",
    accent: "#C9A227",
    accent2: "#7FA3B0",
    paper: "#F6F0DE",
    symbols: [],
    flora: ["🌻", "🌼", "🦋"],
    kind: "firefly",
  },
  autumn: {
    label: "Autumn",
    bg: "radial-gradient(120% 140% at 15% 0%, #2B211A 0%, #1D1712 55%, #14100C 100%)",
    accent: "#A5502D",
    accent2: "#B49A63",
    paper: "#F4ECDD",
    symbols: ["🍂", "🍁"],
    flora: ["🍂", "🍁", "🌰"],
    kind: "fall",
  },
  winter: {
    label: "Winter",
    bg: "radial-gradient(120% 140% at 20% 0%, #21252A 0%, #16191C 55%, #0F1113 100%)",
    accent: "#7C93A8",
    accent2: "#B8BEC4",
    paper: "#F2F1ED",
    symbols: ["❄"],
    flora: ["❄", "🌲", "🤍"],
    kind: "fall",
  },
};

const DEFAULT_DAY = { mood: null, thought: "", events: [], photos: [], voice: [] };

// Seed content is text-only now — photos/voice are real, so they start empty
// until the user adds their own.
const MOCK_DAY_DATA_2026_08 = {
  3: { mood: "calm", thought: "Stood on the dock until the sun burned the fog off the lake. Didn't take a single photo — some mornings you just keep for yourself.", events: [{ id: "e1", title: "Dawn walk", time: "6:40 AM", description: "Long way round, past the boathouse." }], photos: [], voice: [] },
  7: { mood: "joy", thought: "Amma's birthday. The whole family squeezed around one table again — nobody wanted to be the first to leave.", events: [{ id: "e1", title: "Amma's birthday dinner", time: "7:00 PM", description: "Everyone brought a dish. Too much food, as always." }], photos: [], voice: [] },
  12: { mood: "proud", thought: "Finished the manuscript at 11:58pm. Six months of Tuesdays led to this one line: The End.", events: [{ id: "e1", title: "Manuscript deadline", time: "Midnight", description: "Self-imposed. Made it with two minutes to spare." }], photos: [], voice: [] },
  15: { mood: "calm", thought: "Rain caught us on the terrace and we just let it happen instead of running for cover.", events: [], photos: [], voice: [] },
  19: { mood: "warm", thought: "New neighbour, first real conversation. Turns out she also grows tomatoes badly.", events: [{ id: "e1", title: "Porch chat", time: "5:30 PM", description: "Traded seedlings, traded stories." }], photos: [], voice: [] },
  22: { mood: "cozy", thought: "First day it actually felt like autumn. Pulled the grey sweater out without thinking twice.", events: [{ id: "e1", title: "Sweater weather", time: "All day", description: "Coffee tasted better for it." }], photos: [], voice: [] },
  26: { mood: "reflective", thought: "Lost the match, stayed for the sunset anyway. Some evenings don't need a win.", events: [{ id: "e1", title: "Five-a-side", time: "6:00 PM", description: "3-1. Not our night. Worth it regardless." }], photos: [], voice: [] },
  29: { mood: "calm", thought: "Quiet Sunday, nothing planned. Read on the balcony until the light went completely.", events: [], photos: [], voice: [] },
};

function buildGrid(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function makeParticles(season, count) {
  const cfg = SEASONS[season];
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: `${season}-${i}`,
      left: Math.random() * 100,
      top: cfg.kind === "firefly" ? Math.random() * 100 : -10 - Math.random() * 30,
      dx: (Math.random() * 60 - 30).toFixed(0),
      dy: (Math.random() * 40 - 20).toFixed(0),
      duration: (cfg.kind === "firefly" ? 6 + Math.random() * 5 : 10 + Math.random() * 10).toFixed(1),
      delay: (Math.random() * 8).toFixed(1),
      size: cfg.kind === "firefly" ? 3 + Math.random() * 3 : 14 + Math.random() * 10,
      symbol: cfg.symbols.length ? cfg.symbols[Math.floor(Math.random() * cfg.symbols.length)] : null,
    });
  }
  return arr;
}

function getTargetRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(460, vw * 0.92);
  const height = Math.min(720, vh * 0.88);
  return { top: (vh - height) / 2, left: (vw - width) / 2, width, height };
}

function formatDuration(totalSeconds) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(Math.floor(totalSeconds % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

// A new line greets you each real-world day — same quote all day, different
// one tomorrow. Kept short so it sits comfortably next to the season tag.
const DAILY_QUOTES = [
  "Some days ask to be remembered.",
  "Keep the small moments — they add up to a life.",
  "Today is already becoming a memory.",
  "Write it down before the light changes.",
  "The ordinary days are the ones you'll miss most.",
  "A single afternoon can hold a whole season.",
  "Not every day needs a reason to be kept.",
  "The quiet days count too.",
  "Some things are worth keeping just as they were.",
  "Today will only happen once — say hello to it.",
  "The years are long, but the days are proof.",
  "You won't remember the whole month, just this hour.",
  "Little things, kept carefully, become a whole life.",
  "Every date on this calendar was once today.",
  "Save what the light looked like.",
  "A memory is a moment that decided to stay.",
  "Somewhere in this month, something was worth keeping.",
  "The best days rarely announce themselves.",
  "Tomorrow will thank you for writing this down.",
  "Time moves fast; a good memory moves slower.",
  "This day, too, deserves a page.",
  "You'll want this exact ordinary day back someday.",
  "What you notice today, you'll remember tomorrow.",
  "The seasons change; keep a little of each one.",
  "A single kept day outlasts a hundred forgotten ones.",
  "This is the only version of today you'll get.",
];

function getDailyQuote() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayIndex = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];
}

// ---------------------------------------------------------------------------
// A tiny wooden twig-ladder that drops from a branch when you tap the month
// or year name directly. Each twig is an irregular hand-cut stick carrying
// one label, tied between two ropes, with a few season-flora sprigs for
// whimsy. Month and year each get their own independent ladder.
// ---------------------------------------------------------------------------
const TWIG_CLIPS = [
  "polygon(0% 42%, 7% 14%, 40% 6%, 92% 4%, 100% 32%, 97% 58%, 100% 78%, 88% 96%, 40% 92%, 9% 88%, 0% 62%)",
  "polygon(0% 58%, 6% 88%, 42% 94%, 90% 96%, 100% 70%, 96% 44%, 100% 22%, 86% 4%, 38% 8%, 8% 12%, 0% 38%)",
  "polygon(0% 36%, 9% 8%, 44% 4%, 94% 8%, 100% 34%, 95% 52%, 100% 74%, 90% 94%, 42% 96%, 6% 90%, 0% 64%)",
  "polygon(0% 64%, 5% 90%, 40% 96%, 88% 92%, 100% 66%, 94% 46%, 100% 26%, 90% 6%, 44% 4%, 8% 10%, 0% 40%)",
];

function TwigLadder({ items, onSelect, seasonCfg, disabled, triggerClassName, triggerLabel, ariaLabel, scrollable }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const wrapRef = useRef(null);
  const ladderRef = useRef(null);

  const closeDropdown = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 340);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) closeDropdown(); };
    const onKey = (e) => { if (e.key === "Escape") closeDropdown(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeDropdown]);

  useEffect(() => {
    if (!open || !ladderRef.current) return;
    const activeEl = ladderRef.current.querySelector(".twig.current");
    if (activeEl) activeEl.scrollIntoView({ block: "center", behavior: "auto" });
  }, [open]);

  const toggleOpen = () => {
    if (disabled) return;
    if (open) closeDropdown(); else { setOpen(true); setClosing(false); }
  };

  const handlePick = (val) => { onSelect(val); closeDropdown(); };

  const flora = (seasonCfg.flora && seasonCfg.flora.length) ? seasonCfg.flora : ["🌿"];
  const activeIdx = items.findIndex((it) => it.active);

  return (
    <div className="ladder-wrap" ref={wrapRef}>
      <button
        type="button"
        className={triggerClassName}
        onClick={toggleOpen}
        disabled={disabled}
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {triggerLabel}
      </button>

      {open && (
        <div className={`ladder-panel ${closing ? "closing" : "opening"}`}>
          <div className="branch" />
          <div className="rope-top" />

          <div className={`ladder${scrollable ? " scrollable" : ""}`} ref={ladderRef}>
            <div className="rope-side rope-left" />
            <div className="rope-side rope-right" />
            {items.map((it, idx) => {
              const showLeft = idx % 3 === 0;
              const showRight = idx % 4 === 2;
              const delayIdx = Math.min(Math.abs(idx - (activeIdx < 0 ? 0 : activeIdx)), 14);
              return (
                <button
                  key={it.key}
                  type="button"
                  className={`twig${it.active ? " current" : ""}`}
                  style={{ animationDelay: `${delayIdx * 0.035}s`, clipPath: TWIG_CLIPS[idx % TWIG_CLIPS.length] }}
                  onClick={() => handlePick(it.key)}
                >
                  {showLeft && <span className="twig-flora left">{flora[idx % flora.length]}</span>}
                  <span className="twig-label">{it.label}</span>
                  {it.active && <span className="twig-marker">🐦</span>}
                  {showRight && <span className="twig-flora right">{flora[(idx + 1) % flora.length]}</span>}
                </button>
              );
            })}
          </div>

          <div className="ladder-tassel">{flora[0]}</div>
        </div>
      )}
    </div>
  );
}

function MonthTwigPicker({ monthIndex, onSelect, seasonCfg, disabled }) {
  const items = useMemo(
    () => MONTH_NAMES.map((m, idx) => ({ key: idx, label: m.slice(0, 3), active: idx === monthIndex })),
    [monthIndex]
  );
  return (
    <TwigLadder
      items={items}
      onSelect={onSelect}
      seasonCfg={seasonCfg}
      disabled={disabled}
      triggerClassName="month-name-btn"
      triggerLabel={MONTH_NAMES[monthIndex]}
      ariaLabel="Choose a month"
    />
  );
}

const CURRENT_REAL_YEAR = new Date().getFullYear();
const YEAR_RANGE_START = CURRENT_REAL_YEAR - 75;
const YEAR_RANGE_END = CURRENT_REAL_YEAR + 75;

function YearTwigPicker({ year, onSelect, seasonCfg, disabled }) {
  const items = useMemo(() => {
    const list = [];
    for (let y = YEAR_RANGE_START; y <= YEAR_RANGE_END; y++) list.push({ key: y, label: String(y), active: y === year });
    return list;
  }, [year]);

  return (
    <TwigLadder
      items={items}
      onSelect={onSelect}
      seasonCfg={seasonCfg}
      disabled={disabled}
      triggerClassName="year-name-btn"
      triggerLabel={String(year)}
      ariaLabel="Choose a year"
      scrollable
    />
  );
}

export default function MemoryCalendar() {
  const [year, setYear] = useState(2026);
  const [monthIndex, setMonthIndex] = useState(8); // September — autumn
  const [dayData, setDayData] = useState(MOCK_DAY_DATA_2026_08);

  const [activeDay, setActiveDay] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | entering | active | exiting
  const [startRect, setStartRect] = useState(null);
  const [targetRect, setTargetRect] = useState(null);

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");

  const [confirmClearThought, setConfirmClearThought] = useState(false);
  const [confirmClearDay, setConfirmClearDay] = useState(false);
  const [removingIds, setRemovingIds] = useState(() => new Set());

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState(null);
  const [waveLevels, setWaveLevels] = useState(() => Array(24).fill(0.12));
  const [playingId, setPlayingId] = useState(null);

  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxShow, setLightboxShow] = useState(false);

  const cellRefs = useRef({});
  const fileInputRef = useRef(null);
  const wrapRef = useRef(null);
  const particleFieldRef = useRef(null);

  const recordIntervalRef = useRef(null);
  const waveSampleRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const audioElsRef = useRef({});
  const trackedUrls = useRef(new Set());

  const isMockMonth = monthIndex === 8 && year === 2026;
  const season = getSeason(monthIndex);
  const seasonCfg = SEASONS[season];
  const particles = useMemo(() => makeParticles(season, seasonCfg.kind === "firefly" ? 18 : 16), [season]);

  const [bgLayers, setBgLayers] = useState(() => ({ a: season, b: season, active: "a" }));
  useEffect(() => {
    setBgLayers((prev) => {
      if (prev[prev.active] === season) return prev;
      const nextLayer = prev.active === "a" ? "b" : "a";
      return { ...prev, [nextLayer]: season, active: nextLayer };
    });
  }, [season]);

  const micSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof window !== "undefined" && !!window.MediaRecorder;

  const activeData = activeDay != null ? (isMockMonth && dayData[activeDay] ? dayData[activeDay] : DEFAULT_DAY) : null;

  // ---- cleanup helpers -----------------------------------------------------
  const stopWaveSampling = () => {
    if (waveSampleRef.current) { clearInterval(waveSampleRef.current); waveSampleRef.current = null; }
    setWaveLevels(Array(24).fill(0.12));
  };
  const teardownRecordingResources = () => {
    if (recordIntervalRef.current) { clearInterval(recordIntervalRef.current); recordIntervalRef.current = null; }
    stopWaveSampling();
    analyserRef.current = null;
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      teardownRecordingResources();
      trackedUrls.current.forEach((u) => URL.revokeObjectURL(u));
      trackedUrls.current.clear();
      Object.values(audioElsRef.current).forEach((a) => a.pause());
    };
  }, []);

  // ---- open / close panel ---------------------------------------------------
  const openDay = useCallback((day) => {
    if (phase !== "idle") return;
    const el = cellRefs.current[day];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStartRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setTargetRect(getTargetRect());
    setActiveDay(day);
    setShowEventForm(false);
    setEventTitle("");
    setEventTime("");
    setConfirmClearThought(false);
    setConfirmClearDay(false);
    setMicError(null);
    setPhase("entering");
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("active")));
  }, [phase]);

  const closeDay = useCallback(() => {
    if (lightboxUrl) { setLightboxShow(false); setTimeout(() => setLightboxUrl(null), 220); return; }
    if (phase !== "active" && phase !== "entering") return;
    if (isRecording) { try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {} }
    teardownRecordingResources();
    setIsRecording(false);
    setRecordSeconds(0);
    setPlayingId(null);
    setConfirmClearThought(false);
    setConfirmClearDay(false);
    setPhase("exiting");
    setTimeout(() => {
      setActiveDay(null);
      setPhase("idle");
    }, 720);
  }, [phase, isRecording, lightboxUrl]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeDay(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDay]);

  const handleMonthPick = (mIdx) => {
    if (phase !== "idle") return;
    setMonthIndex(mIdx);
  };

  const handleYearPick = (y) => {
    if (phase !== "idle") return;
    setYear(y);
  };

  const updateActiveDayData = (patch) => {
    if (activeDay == null) return;
    setDayData((prev) => {
      const current = prev[activeDay] || DEFAULT_DAY;
      return { ...prev, [activeDay]: { ...current, ...patch(current) } };
    });
  };

  const removeWithAnimation = (key, run) => {
    setRemovingIds((prev) => { const n = new Set(prev); n.add(key); return n; });
    setTimeout(() => {
      run();
      setRemovingIds((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }, 300);
  };

  // ---- thought ---------------------------------------------------------------
  const handleThoughtChange = (val) => updateActiveDayData(() => ({ thought: val }));
  const handleClearThought = () => {
    if (!confirmClearThought) { setConfirmClearThought(true); return; }
    handleThoughtChange("");
    setConfirmClearThought(false);
  };

  // ---- events ------------------------------------------------------------
  const handleAddEvent = () => {
    if (!eventTitle.trim()) return;
    updateActiveDayData((cur) => ({
      events: [...cur.events, { id: `e${Date.now()}`, title: eventTitle.trim(), time: eventTime.trim() || "All day", description: "" }],
    }));
    setEventTitle(""); setEventTime(""); setShowEventForm(false);
  };
  const handleDeleteEvent = (id) => {
    removeWithAnimation(`event-${id}`, () => updateActiveDayData((cur) => ({ events: cur.events.filter((e) => e.id !== id) })));
  };

  // ---- photos (real files) ------------------------------------------------
  const handleAddPhotosClick = () => fileInputRef.current && fileInputRef.current.click();
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const additions = files.map((f) => {
        const url = URL.createObjectURL(f);
        trackedUrls.current.add(url);
        return { id: `p${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url, name: f.name };
      });
      updateActiveDayData((cur) => ({ photos: [...cur.photos, ...additions] }));
    }
    e.target.value = "";
  };
  const handleDeletePhoto = (photo) => {
    removeWithAnimation(`photo-${photo.id}`, () => {
      URL.revokeObjectURL(photo.url);
      trackedUrls.current.delete(photo.url);
      updateActiveDayData((cur) => ({ photos: cur.photos.filter((p) => p.id !== photo.id) }));
    });
  };
  const openLightbox = (url) => {
    setLightboxUrl(url);
    requestAnimationFrame(() => requestAnimationFrame(() => setLightboxShow(true)));
  };
  const closeLightbox = () => { setLightboxShow(false); setTimeout(() => setLightboxUrl(null), 220); };

  // ---- voice recording (real MediaRecorder) -------------------------------
  const startRecording = async () => {
    if (!micSupported) { setMicError("Recording isn't supported in this browser."); return; }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = window.MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        trackedUrls.current.add(url);
        const duration = formatDuration(recordSeconds);
        updateActiveDayData((cur) => ({ voice: [...cur.voice, { id: `v${Date.now()}`, url, duration }] }));
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        waveSampleRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const bucketSize = Math.max(1, Math.floor(data.length / 24));
          const levels = [];
          for (let i = 0; i < 24; i++) {
            let sum = 0;
            for (let j = 0; j < bucketSize; j++) sum += data[i * bucketSize + j] || 0;
            levels.push(Math.min(1, sum / bucketSize / 255));
          }
          setWaveLevels(levels);
        }, 90);
      }
    } catch (err) {
      if (err && err.name === "NotAllowedError") {
        setMicError("Microphone access was denied. Enable it in your browser's site settings to record.");
      } else if (err && err.name === "NotFoundError") {
        setMicError("No microphone was found on this device.");
      } else {
        setMicError("Couldn't start recording. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    try { mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive" && mediaRecorderRef.current.stop(); } catch (e) {}
    if (recordIntervalRef.current) { clearInterval(recordIntervalRef.current); recordIntervalRef.current = null; }
    stopWaveSampling();
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    analyserRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setIsRecording(false);
  };

  const toggleRecording = () => { if (isRecording) stopRecording(); else startRecording(); };

  const ensureAudioEl = (id, url) => {
    if (!audioElsRef.current[id]) {
      const a = new Audio(url);
      a.addEventListener("ended", () => setPlayingId((cur) => (cur === id ? null : cur)));
      audioElsRef.current[id] = a;
    }
    return audioElsRef.current[id];
  };
  const togglePlay = (id, url) => {
    const audio = ensureAudioEl(id, url);
    if (playingId === id) { audio.pause(); setPlayingId(null); return; }
    Object.entries(audioElsRef.current).forEach(([key, a]) => { if (key !== String(id)) a.pause(); });
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setPlayingId(id);
  };
  const handleDeleteVoice = (voice) => {
    if (playingId === voice.id) setPlayingId(null);
    const a = audioElsRef.current[voice.id];
    if (a) { a.pause(); delete audioElsRef.current[voice.id]; }
    removeWithAnimation(`voice-${voice.id}`, () => {
      URL.revokeObjectURL(voice.url);
      trackedUrls.current.delete(voice.url);
      updateActiveDayData((cur) => ({ voice: cur.voice.filter((v) => v.id !== voice.id) }));
    });
  };

  // ---- clear whole day -----------------------------------------------------
  const handleClearDay = () => {
    if (!confirmClearDay) { setConfirmClearDay(true); return; }
    if (activeData) {
      activeData.photos.forEach((p) => { URL.revokeObjectURL(p.url); trackedUrls.current.delete(p.url); });
      activeData.voice.forEach((v) => { URL.revokeObjectURL(v.url); trackedUrls.current.delete(v.url); if (audioElsRef.current[v.id]) { audioElsRef.current[v.id].pause(); delete audioElsRef.current[v.id]; } });
    }
    setPlayingId(null);
    updateActiveDayData(() => ({ mood: null, thought: "", events: [], photos: [], voice: [] }));
    setConfirmClearDay(false);
  };

  // ---- ambient parallax ----------------------------------------------------
  const handleWrapMouseMove = (e) => {
    if (!particleFieldRef.current) return;
    const px = (e.clientX / window.innerWidth - 0.5) * 14;
    const py = (e.clientY / window.innerHeight - 0.5) * 14;
    particleFieldRef.current.style.transform = `translate(${px}px, ${py}px)`;
  };

  const handleCellTilt = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-2px)`;
  };
  const handleCellTiltReset = (e) => { e.currentTarget.style.transform = ""; };

  const cells = useMemo(() => buildGrid(year, monthIndex), [year, monthIndex]);
  const dailyQuote = useMemo(() => getDailyQuote(), []);
  const today = new Date();

  const shellRect = phase === "active" ? targetRect : startRect;
  const panelOpen = phase !== "idle";
  const flipped = phase === "active";

  return (
    <div className="wrap" ref={wrapRef} onMouseMove={handleWrapMouseMove}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340;9..144,480;9..144,560&family=Work+Sans:wght@400;500;600&family=Caveat:wght@500;600&display=swap');
        * { box-sizing: border-box; }

        .wrap {
          --paper: ${seasonCfg.paper};
          --accent: ${seasonCfg.accent};
          --accent2: ${seasonCfg.accent2};
          --espresso: #211C18;
          --ink-900: #241F1B;
          --ink-850: #2C2620;
          --text-light: #F5F0E6;
          --text-muted: #B7AC94;
          --line: rgba(245,240,230,0.09);

          position: relative;
          min-height: 100vh;
          width: 100%;
          color: var(--text-light);
          font-family: 'Work Sans', sans-serif;
          padding: 48px 40px 64px;
          overflow: hidden;
          background: var(--espresso);
        }

        .bg-layer { position: fixed; inset: 0; z-index: 0; transition: opacity 1.1s ease; }

        .orb { position: fixed; border-radius: 999px; filter: blur(60px); opacity: 0.16; z-index: 0; pointer-events: none; mix-blend-mode: screen; }
        .orb-1 { width: 360px; height: 360px; top: -80px; right: -60px; background: var(--accent); animation: floatOrb 26s ease-in-out infinite; }
        .orb-2 { width: 300px; height: 300px; bottom: -100px; left: -60px; background: var(--accent2); animation: floatOrb 32s ease-in-out infinite reverse; }
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -24px); }
        }

        .particle-field { position: fixed; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; transition: transform .6s ease-out; }
        .particle { position: absolute; will-change: transform, opacity; }
        .particle.fall { animation-name: particleFall; animation-timing-function: linear; animation-iteration-count: infinite; }
        .particle.firefly {
          border-radius: 999px;
          background: radial-gradient(circle, var(--accent) 0%, rgba(201,162,39,0) 70%);
          box-shadow: 0 0 8px 2px var(--accent);
          animation-name: fireflyDrift; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
        }
        @keyframes particleFall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          8% { opacity: .75; } 92% { opacity: .75; }
          100% { transform: translateY(112vh) translateX(var(--dx)) rotate(200deg); opacity: 0; }
        }
        @keyframes fireflyDrift {
          0%, 100% { opacity: .16; transform: translate(0,0); }
          50% { opacity: .9; transform: translate(var(--dx), var(--dy)); }
        }

        .content { position: relative; z-index: 2; }

        .header {
          display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px;
          max-width: 920px; margin: 0 auto 36px; padding-bottom: 22px; border-bottom: 1px solid var(--line);
        }
        .month-block { display: flex; align-items: baseline; gap: 14px; }
        .season-tag { font-size: 12px; color: var(--accent); margin-left: 2px; transition: color .6s ease; }
        .subhead { font-size: 14.5px; color: var(--text-muted); margin-top: 8px; max-width: 42ch; }
        .daily-quote { font-family: 'Caveat', cursive; font-size: 18px; color: var(--text-light); opacity: .82; }

        .month-name-btn, .year-name-btn {
          font-family: 'Fraunces', serif; background: none; border: none; padding: 2px 3px; cursor: pointer;
          line-height: 1; border-radius: 6px;
          transition: color .2s ease, transform .15s ease, background .2s ease;
        }
        .month-name-btn { font-weight: 480; font-size: 52px; letter-spacing: -0.01em; color: var(--text-light); }
        .year-name-btn { font-weight: 340; font-size: 24px; color: var(--text-muted); }
        .month-name-btn:hover, .year-name-btn:hover { color: var(--accent); background: rgba(245,240,230,0.05); transform: translateY(-1px); }
        .month-name-btn:active, .year-name-btn:active { transform: scale(.97); }
        .month-name-btn:disabled, .year-name-btn:disabled { opacity: .55; cursor: default; transform: none; }
        .month-name-btn:focus-visible, .year-name-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        /* ---- whimsical twig-ladder month/year picker ---- */
        .ladder-wrap { position: relative; display: inline-block; }

        .ladder-panel {
          position: absolute; top: calc(100% + 10px); left: 50%; z-index: 80;
          display: flex; flex-direction: column; align-items: center;
          transform-origin: top center; margin-left: -100px;
        }
        .ladder-panel.opening {
          animation: ladderDrop .55s cubic-bezier(.34,1.4,.4,1) forwards, ladderSway 3.4s ease-in-out .55s infinite;
        }
        .ladder-panel.closing { animation: ladderRetract .34s cubic-bezier(.4,0,1,1) forwards; }
        @keyframes ladderDrop {
          0% { opacity: 0; transform: translateY(-28px) scaleY(.4) rotate(-3deg); }
          60% { opacity: 1; transform: translateY(4px) scaleY(1.03) rotate(1.4deg); }
          100% { opacity: 1; transform: translateY(0) scaleY(1) rotate(0deg); }
        }
        @keyframes ladderSway {
          0%, 100% { transform: rotate(-1.2deg); }
          50% { transform: rotate(1.2deg); }
        }
        @keyframes ladderRetract { to { opacity: 0; transform: translateY(-22px) scaleY(.5) rotate(-4deg); } }

        .branch { width: 90px; height: 10px; border-radius: 6px; background: linear-gradient(180deg, #6b4a2c, #45300f); box-shadow: 0 2px 5px rgba(0,0,0,.35); }
        .rope-top { width: 3px; height: 14px; background: repeating-linear-gradient(#cbb994 0 2px, #a9946b 2px 4px); }

        .ladder { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 10px 26px; width: 200px; }
        .ladder.scrollable {
          max-height: 320px; overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin; scrollbar-color: #a9946b transparent;
        }
        .ladder.scrollable::-webkit-scrollbar { width: 5px; }
        .ladder.scrollable::-webkit-scrollbar-thumb { background: #a9946b; border-radius: 3px; }
        .ladder.scrollable::-webkit-scrollbar-track { background: transparent; }
        .rope-side {
          position: absolute; top: 0; bottom: 0; width: 4px; border-radius: 2px;
          background: repeating-linear-gradient(#cbb994 0 3px, #a9946b 3px 6px);
        }
        .rope-left { left: 6px; }
        .rope-right { right: 6px; }

        .twig {
          position: relative; z-index: 1; height: 30px;
          background-image:
            radial-gradient(circle at 28% 62%, rgba(0,0,0,.3) 0 3px, transparent 5px),
            radial-gradient(circle at 74% 32%, rgba(0,0,0,.2) 0 2px, transparent 4px),
            repeating-linear-gradient(96deg, #9a6b3f 0 4px, #8a5a35 4px 8px, #7a4d2c 8px 10px);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-family: 'Work Sans', sans-serif; font-size: 11.5px; font-weight: 700; letter-spacing: .04em;
          color: #f6ecd9;
          text-shadow: 0 1px 0 rgba(255,255,255,.16), 0 -1px 1px rgba(0,0,0,.45);
          filter: drop-shadow(0 3px 3px rgba(0,0,0,.28));
          opacity: 0; transform: translateY(-6px);
          animation: twigIn .4s ease forwards;
          transition: transform .15s ease, filter .2s ease;
        }
        @keyframes twigIn { to { opacity: 1; transform: translateY(0); } }
        .twig:hover { filter: drop-shadow(0 5px 6px rgba(0,0,0,.35)) brightness(1.08); transform: translateY(-2px) scale(1.04); }
        .twig:active { transform: translateY(1px) scale(.97); }
        .twig.current {
          background-image:
            radial-gradient(circle at 28% 62%, rgba(0,0,0,.22) 0 3px, transparent 5px),
            radial-gradient(circle at 74% 32%, rgba(0,0,0,.14) 0 2px, transparent 4px),
            repeating-linear-gradient(96deg, var(--accent) 0 4px, color-mix(in srgb, var(--accent) 65%, #7a4d2c) 4px 8px, #7a4d2c 8px 10px);
          color: #2b2418; text-shadow: 0 1px 0 rgba(255,255,255,.3);
        }
        .twig-flora { position: absolute; font-size: 14px; filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); }
        .twig-flora.left { left: -17px; }
        .twig-flora.right { right: -17px; }
        .twig-marker { font-size: 11px; }
        .ladder-tassel { margin-top: 6px; font-size: 15px; opacity: .9; }

        @media (max-width: 640px) {
          .ladder-panel { margin-left: -100px; }
        }

        .calendar { max-width: 920px; margin: 0 auto; transition: filter .5s ease, opacity .5s ease; }
        .calendar.dimmed { filter: blur(5px) brightness(.6); opacity: .7; pointer-events: none; }

        .day-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 12px; }
        .day-label { text-align: center; font-size: 12px; color: var(--text-muted); font-weight: 500; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
        .slot { aspect-ratio: 1 / 1; }

        .cell {
          width: 100%; height: 100%; border-radius: 14px;
          background: linear-gradient(155deg, var(--ink-900) 0%, var(--ink-850) 100%);
          border: 1px solid var(--line);
          padding: 10px 12px; display: flex; flex-direction: column; justify-content: space-between;
          cursor: pointer; transition: border-color .25s ease, transform .15s ease, box-shadow .25s ease;
          font-family: inherit; color: inherit; text-align: left;
        }
        .cell.today {
          background: linear-gradient(155deg, #fff8dc 0%, #ead89a 100%);
          border-color: #fff4b0;
          color: #3b301c;
          box-shadow: 0 0 0 1px rgba(255,244,176,.45), 0 0 22px rgba(255,220,112,.42), 0 8px 22px rgba(0,0,0,.24);
        }
        .cell.today .day-abbr { color: #806b38; }
        .cell.today:hover { border-color: #fff8cf; box-shadow: 0 0 0 2px rgba(255,244,176,.55), 0 0 30px rgba(255,220,112,.58), 0 10px 24px rgba(0,0,0,.3); }
        .cell:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); box-shadow: 0 10px 22px rgba(0,0,0,.28); }
        .cell:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .cell.hidden-self { visibility: hidden; }
        .date-num { font-family: 'Fraunces', serif; font-weight: 480; font-size: 26px; line-height: 1; }
        .day-abbr { font-size: 10.5px; color: var(--text-muted); }
        .cell-foot { display: flex; justify-content: flex-end; }
        .mood-dot { width: 8px; height: 8px; border-radius: 999px; }

        /* ---- shared-element expanding panel ---- */
        .scrim { position: fixed; inset: 0; z-index: 50; background: rgba(15,12,9,0); transition: background .6s ease; pointer-events: none; }
        .scrim.show { background: rgba(15,12,9,.5); pointer-events: auto; }

        .card-shell {
          position: fixed; z-index: 60; border-radius: 20px;
          transition: top .72s cubic-bezier(.22,1,.36,1), left .72s cubic-bezier(.22,1,.36,1),
                      width .72s cubic-bezier(.22,1,.36,1), height .72s cubic-bezier(.22,1,.36,1), box-shadow .72s ease;
          box-shadow: 0 12px 26px rgba(0,0,0,.35);
        }
        .card-shell.flipped { box-shadow: 0 48px 90px rgba(0,0,0,.55); }
        .perspective { width: 100%; height: 100%; perspective: 2200px; border-radius: inherit; }
        .flipper { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform .72s cubic-bezier(.22,1,.36,1); transform: rotateY(0deg); }
        .flipper.flipped { transform: rotateY(180deg); }
        .face { position: absolute; inset: 0; border-radius: 20px; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .face-front {
          background: linear-gradient(155deg, var(--ink-900) 0%, var(--ink-850) 100%);
          border: 1px solid var(--line);
          display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px;
          transition: opacity .22s ease;
        }
        .face-front.fade { opacity: 0; }
        .face-front .big-date { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 480; }
        .face-front .big-mood { width: 10px; height: 10px; border-radius: 999px; }

        .face-back {
          background-color: #8f6139;
          background-image:
            radial-gradient(circle at 16% 22%, rgba(0,0,0,.16) 0 5px, transparent 9px),
            radial-gradient(circle at 84% 58%, rgba(0,0,0,.12) 0 4px, transparent 8px),
            radial-gradient(circle at 42% 86%, rgba(0,0,0,.10) 0 4px, transparent 7px),
            repeating-linear-gradient(90deg, #a9764a 0 3px, #9c6c42 3px 6px, #8f6139 6px 9px, #83572f 9px 12px);
          color: #f5ecd8;
          transform: rotateY(180deg); display: flex; flex-direction: column;
          transition: opacity .35s ease .3s; opacity: 0;
        }
        .face-back.show { opacity: 1; }

        .panel-header { padding: 26px 24px 16px; display: flex; align-items: flex-start; justify-content: space-between; }
        .panel-date-block { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .panel-date {
          font-family: 'Fraunces', serif; font-weight: 480; font-size: 44px; line-height: 1;
          text-shadow: 0 1px 0 rgba(255,255,255,.16), 0 -1px 2px rgba(0,0,0,.5);
        }
        .panel-month { font-family: 'Fraunces', serif; font-size: 18px; color: #f0e3c8; text-shadow: 0 -1px 2px rgba(0,0,0,.45); }
        .panel-year { font-size: 13px; color: #d9c7a3; }

        .panel-scroll {
          flex: 1; overflow-y: auto; margin: 2px 16px 16px; padding: 20px 20px 26px;
          background: var(--paper); color: #2b2418; border-radius: 14px;
          box-shadow: 0 10px 20px rgba(0,0,0,.3), inset 0 0 0 1px rgba(0,0,0,.05);
        }

        /* ---- botanical hanging-sign frame around the opened panel ---- */
        .panel-frame {
          position: absolute; inset: -46px -18px -16px -18px; z-index: 5;
          pointer-events: none; opacity: 0; transition: opacity .5s ease .28s;
        }
        .panel-frame.show { opacity: 1; }

        .frame-branch {
          position: absolute; top: 0; left: 50%; width: 118px; height: 12px; margin-left: -59px;
          border-radius: 7px; background: linear-gradient(180deg, #6b4a2c, #45300f);
          box-shadow: 0 3px 6px rgba(0,0,0,.4);
        }
        .frame-rope {
          position: absolute; top: 10px; width: 3px; height: 38px;
          background: repeating-linear-gradient(#cbb994 0 2px, #a9946b 2px 4px);
        }
        .frame-rope-left { left: 22%; }
        .frame-rope-right { right: 22%; }
        .rope-leaf { position: absolute; left: -6px; font-size: 11px; filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); }
        .frame-rope-right .rope-leaf { left: auto; right: -6px; transform: scaleX(-1); }

        .frame-corner { position: absolute; font-size: 24px; display: flex; align-items: center; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
        .frame-corner .fc-flower, .frame-corner .fc-leaf { display: inline-block; }
        .frame-corner.tl { top: 42px; left: -6px; transform: rotate(-16deg); }
        .frame-corner.tl .fc-flower { margin-left: -6px; }
        .frame-corner.tr { top: 42px; right: -6px; transform: rotate(16deg) scaleX(-1); }
        .frame-corner.tr .fc-leaf { margin-left: -6px; }
        .frame-corner.bl { bottom: -4px; left: -6px; transform: rotate(14deg); }
        .frame-corner.bl .fc-leaf { margin-left: -6px; }
        .frame-corner.br { bottom: -4px; right: -6px; transform: rotate(-14deg) scaleX(-1); }
        .frame-corner.br .fc-flower { margin-left: -6px; }

        .frame-vine { position: absolute; font-size: 17px; opacity: .85; filter: drop-shadow(0 2px 3px rgba(0,0,0,.3)); }
        .frame-vine-left { top: 46%; left: -10px; transform: rotate(-8deg); }
        .frame-vine-right { top: 58%; right: -10px; transform: rotate(8deg) scaleX(-1); }

        .butterfly { position: absolute; font-size: 17px; transform-origin: center; animation: butterflyFloat 7s ease-in-out infinite; }
        .butterfly .bf-flap { display: inline-block; animation: wingFlap .5s ease-in-out infinite; }
        .bf-1 { top: 30px; left: -2px; animation-duration: 6.5s; }
        .bf-2 { top: 60px; right: 2px; animation-duration: 8s; animation-delay: 1.2s; }
        .bf-3 { bottom: 40px; left: 6px; animation-duration: 7.2s; animation-delay: 2.4s; }
        @keyframes butterflyFloat {
          0% { transform: translate(0,0) rotate(0deg); }
          25% { transform: translate(13px,-12px) rotate(10deg); }
          50% { transform: translate(3px,-22px) rotate(-6deg); }
          75% { transform: translate(-11px,-8px) rotate(-12deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        @keyframes wingFlap { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.55); } }

        .close-btn {
          width: 32px; height: 32px; border-radius: 999px; border: 1px solid rgba(245,240,230,0.35);
          background: rgba(0,0,0,0.18); color: #f5ecd8; font-size: 16px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; transition: background .2s ease, transform .12s ease;
        }
        .close-btn:hover { background: rgba(0,0,0,0.3); }
        .close-btn:active { transform: scale(.9); }
        .close-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .section { margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(43,36,24,0.08); opacity: 0; transform: translateY(10px); }
        .section.sec-1 { margin-top: 22px; padding-top: 0; border-top: none; }
        .face-back.show .section { animation: sectionIn .55s ease forwards; }
        .face-back.show .sec-1 { animation-delay: .05s; }
        .face-back.show .sec-2 { animation-delay: .18s; }
        .face-back.show .sec-3 { animation-delay: .31s; }
        .face-back.show .sec-4 { animation-delay: .44s; }
        @keyframes sectionIn { to { opacity: 1; transform: translateY(0); } }

        .sec-label { font-size: 11px; color: #8a7c5e; letter-spacing: .02em; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
        .sec-label b { color: #4d4430; font-weight: 600; font-size: 12px; }

        .thought-box {
          width: 100%; min-height: 92px; resize: vertical; border: none; background: transparent;
          font-family: 'Caveat', cursive; font-size: 22px; line-height: 1.4; color: #3a3122; padding: 0; outline: none;
        }
        .thought-box::placeholder { color: #9c8f70; }

        .text-link {
          font-size: 11px; color: #9c8f70; background: none; border: none; cursor: pointer; padding: 2px 4px;
          transition: color .15s ease;
        }
        .text-link:hover { color: #6b5f45; }
        .text-link.danger { color: #a5502d; }
        .text-link.danger:hover { color: #7d3c21; }

        .event-item { padding: 10px 0; border-bottom: 1px solid rgba(43,36,24,0.08); display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; transition: opacity .3s ease, transform .3s ease; }
        .event-item:last-child { border-bottom: none; }
        .event-item.removing { opacity: 0; transform: translateX(10px) scale(.96); }
        .event-main { flex: 1; min-width: 0; }
        .event-top { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; }
        .event-title { font-weight: 600; color: #33291a; }
        .event-time { color: #8a7c5e; white-space: nowrap; }
        .event-desc { font-size: 12px; color: #6b5f45; margin-top: 2px; }
        .icon-del {
          width: 20px; height: 20px; border-radius: 999px; border: none; background: transparent; color: #9c8f70;
          font-size: 13px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          transition: background .15s ease, color .15s ease;
        }
        .icon-del:hover { background: rgba(165,80,45,0.12); color: #a5502d; }
        .empty-note { font-size: 12px; color: #9c8f70; font-style: italic; }

        .ghost-btn {
          margin-top: 10px; font-size: 12px; color: #6b5f45; background: rgba(43,36,24,0.06);
          border: 1px solid rgba(43,36,24,0.12); border-radius: 8px; padding: 7px 12px; cursor: pointer;
          transition: background .2s ease, transform .12s ease;
        }
        .ghost-btn:hover { background: rgba(43,36,24,0.12); }
        .ghost-btn:active { transform: scale(.96); }
        .ghost-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .event-form { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
        .event-form input {
          font-size: 12.5px; padding: 7px 9px; border-radius: 7px; border: 1px solid rgba(43,36,24,0.15);
          background: rgba(255,255,255,0.5); font-family: 'Work Sans', sans-serif; outline: none;
        }
        .event-form input:focus { border-color: var(--accent); }
        .event-form-actions { display: flex; gap: 8px; margin-top: 2px; }
        .save-btn { font-size: 12px; background: var(--accent); color: #2b2418; border: none; border-radius: 7px; padding: 6px 12px; cursor: pointer; font-weight: 600; transition: transform .12s ease; }
        .save-btn:active { transform: scale(.95); }

        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 4px; }
        .photo-tile {
          position: relative; aspect-ratio: 1 / 1; border-radius: 10px; overflow: hidden; cursor: pointer;
          opacity: 0; transform: translateY(8px) scale(.94); animation: photoIn .5s ease forwards;
          transition: opacity .3s ease, transform .3s ease;
        }
        .photo-tile.removing { opacity: 0 !important; transform: scale(.8) !important; }
        .photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .45s ease; }
        .photo-tile:hover img { transform: scale(1.09); }
        @keyframes photoIn { to { opacity: 1; transform: translateY(0) scale(1); } }
        .photo-del {
          position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border-radius: 999px; border: none;
          background: rgba(20,16,10,0.55); color: #f5f0e6; font-size: 11px; cursor: pointer; opacity: 0;
          display: flex; align-items: center; justify-content: center; transition: opacity .15s ease, background .15s ease;
        }
        .photo-tile:hover .photo-del { opacity: 1; }
        .photo-del:hover { background: rgba(165,80,45,0.85); }

        .hidden-input { display: none; }

        .voice-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(43,36,24,0.08); transition: opacity .3s ease, transform .3s ease; }
        .voice-row:last-child { border-bottom: none; }
        .voice-row.removing { opacity: 0; transform: translateX(10px) scale(.96); }
        .play-btn { width: 26px; height: 26px; border-radius: 999px; border: none; background: rgba(43,36,24,0.1); color: #3a3122; font-size: 11px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: transform .12s ease; }
        .play-btn:active { transform: scale(.9); }
        .waveform { flex: 1; height: 20px; display: flex; align-items: center; gap: 2px; overflow: hidden; }
        .waveform span { width: 2.5px; background: #9c8f70; border-radius: 2px; height: 40%; }
        .waveform.playing span { animation: bar 1s ease-in-out infinite; background: var(--accent); }
        .waveform span:nth-child(odd) { animation-delay: .1s; }
        .waveform span:nth-child(3n) { animation-delay: .2s; }
        @keyframes bar { 0%, 100% { height: 25%; } 50% { height: 90%; } }
        .voice-duration { font-size: 11px; color: #8a7c5e; width: 34px; text-align: right; }

        .record-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
        .record-btn {
          width: 44px; height: 44px; border-radius: 999px; border: none; cursor: pointer;
          background: #a5502d; color: #fff; font-size: 16px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 0 rgba(165,80,45,0.5); transition: transform .15s ease;
        }
        .record-btn.recording { animation: pulse 1.4s ease-in-out infinite; }
        .record-btn:active { transform: scale(.94); }
        .record-btn:disabled { opacity: .4; cursor: default; animation: none; }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(165,80,45,.5); }
          70% { box-shadow: 0 0 0 14px rgba(165,80,45,0); }
          100% { box-shadow: 0 0 0 0 rgba(165,80,45,0); }
        }
        .record-status { font-size: 12px; color: #6b5f45; }
        .record-timer { font-variant-numeric: tabular-nums; color: #3a3122; font-weight: 600; }
        .mic-error { font-size: 11.5px; color: #a5502d; margin-top: 8px; }
        .live-wave { display: flex; align-items: flex-end; gap: 2px; height: 26px; margin-top: 10px; }
        .live-wave span { width: 3px; background: var(--accent); border-radius: 2px; transition: height .09s ease; }

        .clear-day-row { text-align: center; margin-top: 30px; padding-top: 18px; border-top: 1px dashed rgba(43,36,24,0.12); }

        .lightbox-overlay {
          position: fixed; inset: 0; z-index: 100; background: rgba(10,8,6,0);
          display: flex; align-items: center; justify-content: center; padding: 40px;
          opacity: 0; transition: opacity .25s ease; pointer-events: none;
        }
        .lightbox-overlay.show { opacity: 1; background: rgba(10,8,6,0.82); pointer-events: auto; }
        .lightbox-img { max-width: 90vw; max-height: 86vh; border-radius: 10px; transform: scale(.92); transition: transform .3s cubic-bezier(.22,1,.36,1); box-shadow: 0 30px 70px rgba(0,0,0,.5); }
        .lightbox-overlay.show .lightbox-img { transform: scale(1); }
        .lightbox-close {
          position: absolute; top: 22px; right: 26px; width: 38px; height: 38px; border-radius: 999px;
          border: 1px solid rgba(245,240,230,0.25); background: rgba(245,240,230,0.08); color: #f5f0e6;
          font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
        }

        @media (max-width: 640px) {
          .wrap { padding: 32px 16px 48px; }
          .month-name-btn { font-size: 36px; }
          .grid, .day-row { gap: 7px; }
          .date-num { font-size: 17px; }
          .panel-date { font-size: 34px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .card-shell, .flipper, .face-front, .face-back, .section, .photo-tile, .particle, .orb { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div className="bg-layer" style={{ background: SEASONS[bgLayers.a].bg, opacity: bgLayers.active === "a" ? 1 : 0 }} />
      <div className="bg-layer" style={{ background: SEASONS[bgLayers.b].bg, opacity: bgLayers.active === "b" ? 1 : 0 }} />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="particle-field" ref={particleFieldRef}>
        {particles.map((p) => (
          <div
            key={p.id}
            className={`particle ${seasonCfg.kind}`}
            style={{
              left: `${p.left}%`,
              top: seasonCfg.kind === "firefly" ? `${p.top}%` : `${p.top}vh`,
              width: p.size, height: p.size,
              fontSize: seasonCfg.kind === "firefly" ? undefined : p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}px`, "--dy": `${p.dy}px`,
            }}
          >
            {seasonCfg.kind === "fall" ? p.symbol : null}
          </div>
        ))}
      </div>

      <div className="content">
        <div className="header">
          <div>
            <div className="month-block">
              <MonthTwigPicker monthIndex={monthIndex} onSelect={handleMonthPick} seasonCfg={seasonCfg} disabled={panelOpen} />
              <YearTwigPicker year={year} onSelect={handleYearPick} seasonCfg={seasonCfg} disabled={panelOpen} />
            </div>
            <p className="subhead">
              <span className="season-tag">{seasonCfg.label}</span> — <span className="daily-quote">{dailyQuote}</span>
            </p>
          </div>
        </div>

        <div className={`calendar${panelOpen ? " dimmed" : ""}`}>
          <div className="day-row">
            {DAY_LABELS.map((d) => <div className="day-label" key={d}>{d}</div>)}
          </div>
          <div className="grid">
            {cells.map((day, i) => {
              if (day === null) return <div className="slot" key={`blank-${i}`} />;
              const data = isMockMonth ? dayData[day] : null;
              const mood = data && data.mood ? MOODS[data.mood] : null;
              const dayAbbr = DAY_LABELS[new Date(year, monthIndex, day).getDay()];
              const isThisActive = activeDay === day && panelOpen;
              const isToday = today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === day;

              return (
                <div className="slot" key={day}>
                  <button
                    type="button"
                    ref={(el) => { cellRefs.current[day] = el; }}
                    className={`cell${isToday ? " today" : ""}${isThisActive ? " hidden-self" : ""}`}
                    onClick={() => openDay(day)}
                    onMouseMove={handleCellTilt}
                    onMouseLeave={handleCellTiltReset}
                    aria-label={`${MONTH_NAMES[monthIndex]} ${day}${mood ? ", has a memory" : ""}`}
                  >
                    <div>
                      <div className="date-num">{day}</div>
                      <div className="day-abbr">{dayAbbr}</div>
                    </div>
                    <div className="cell-foot">
                      {mood && <span className="mood-dot" style={{ background: mood }} />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`scrim${panelOpen ? " show" : ""}`} onClick={closeDay} />

      {activeDay != null && shellRect && (
        <div
          className={`card-shell${flipped ? " flipped" : ""}`}
          style={{ top: shellRect.top, left: shellRect.left, width: shellRect.width, height: shellRect.height }}
        >
          <div className="perspective">
            <div className={`flipper${flipped ? " flipped" : ""}`}>
              <div className={`face face-front${flipped ? " fade" : ""}`}>
                <div className="big-date">{activeDay}</div>
                {activeData && activeData.mood && <span className="big-mood" style={{ background: MOODS[activeData.mood] }} />}
              </div>

              <div className={`face face-back${flipped ? " show" : ""}`}>
                <div className="panel-header">
                  <div>
                    <div className="panel-date-block">
                      <div className="panel-date">{activeDay}</div>
                      <div className="panel-month">{MONTH_NAMES[monthIndex]}</div>
                      <div className="panel-year">{year}</div>
                    </div>
                  </div>
                  <button className="close-btn" onClick={closeDay} aria-label="Close">×</button>
                </div>

                <div className="panel-scroll">
                  <div className="section sec-1">
                    <div className="sec-label">
                      <b>Today's thought</b>
                      {activeData && activeData.thought && (
                        <button className={`text-link${confirmClearThought ? " danger" : ""}`} onClick={handleClearThought}>
                          {confirmClearThought ? "Confirm clear?" : "Clear"}
                        </button>
                      )}
                    </div>
                    <textarea
                      className="thought-box"
                      placeholder="Write something about today…"
                      value={activeData ? activeData.thought : ""}
                      onChange={(e) => handleThoughtChange(e.target.value)}
                      onFocus={() => setConfirmClearThought(false)}
                    />
                  </div>

                  <div className="section sec-2">
                    <div className="sec-label"><b>My events</b></div>
                    {activeData && activeData.events.length > 0 ? (
                      activeData.events.map((ev) => (
                        <div className={`event-item${removingIds.has(`event-${ev.id}`) ? " removing" : ""}`} key={ev.id}>
                          <div className="event-main">
                            <div className="event-top">
                              <span className="event-title">{ev.title}</span>
                              <span className="event-time">{ev.time}</span>
                            </div>
                            {ev.description && <div className="event-desc">{ev.description}</div>}
                          </div>
                          <button className="icon-del" onClick={() => handleDeleteEvent(ev.id)} aria-label={`Delete ${ev.title}`}>×</button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-note">No events yet.</div>
                    )}

                    {showEventForm ? (
                      <div className="event-form">
                        <input placeholder="Event title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
                        <input placeholder="Time (e.g. 6:00 PM)" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                        <div className="event-form-actions">
                          <button className="save-btn" onClick={handleAddEvent}>Save</button>
                          <button className="ghost-btn" onClick={() => setShowEventForm(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="ghost-btn" onClick={() => setShowEventForm(true)}>+ Add event</button>
                    )}
                  </div>

                  <div className="section sec-3">
                    <div className="sec-label"><b>Memories</b></div>
                    {activeData && activeData.photos.length > 0 ? (
                      <div className="photo-grid">
                        {activeData.photos.map((ph, idx) => (
                          <div
                            key={ph.id}
                            className={`photo-tile${removingIds.has(`photo-${ph.id}`) ? " removing" : ""}`}
                            style={{ animationDelay: `${0.1 + idx * 0.08}s` }}
                            onClick={() => openLightbox(ph.url)}
                          >
                            <img src={ph.url} alt={ph.name || "Memory photo"} />
                            <button className="photo-del" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(ph); }} aria-label="Delete photo">×</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-note">No photos yet.</div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden-input"
                      onChange={handleFilesSelected}
                    />
                    <button className="ghost-btn" onClick={handleAddPhotosClick}>+ Add photos</button>
                  </div>

                  <div className="section sec-4">
                    <div className="sec-label"><b>Voice memory</b></div>
                    {activeData && activeData.voice.length > 0 && activeData.voice.map((v) => (
                      <div className={`voice-row${removingIds.has(`voice-${v.id}`) ? " removing" : ""}`} key={v.id}>
                        <button className="play-btn" onClick={() => togglePlay(v.id, v.url)}>
                          {playingId === v.id ? "❚❚" : "▶"}
                        </button>
                        <div className={`waveform${playingId === v.id ? " playing" : ""}`}>
                          {Array.from({ length: 24 }).map((_, i) => <span key={i} />)}
                        </div>
                        <span className="voice-duration">{v.duration}</span>
                        <button className="icon-del" onClick={() => handleDeleteVoice(v)} aria-label="Delete recording">×</button>
                      </div>
                    ))}
                    {(!activeData || activeData.voice.length === 0) && !isRecording && (
                      <div className="empty-note">No voice memories yet.</div>
                    )}

                    {isRecording && (
                      <div className="live-wave">
                        {waveLevels.map((lvl, i) => (
                          <span key={i} style={{ height: `${8 + lvl * 26}px` }} />
                        ))}
                      </div>
                    )}

                    <div className="record-row">
                      <button
                        className={`record-btn${isRecording ? " recording" : ""}`}
                        onClick={toggleRecording}
                        disabled={!micSupported}
                        aria-label={isRecording ? "Stop recording" : "Record a voice memory"}
                      >
                        {isRecording ? "■" : "●"}
                      </button>
                      {isRecording ? (
                        <span className="record-status">Recording… <span className="record-timer">{formatDuration(recordSeconds)}</span></span>
                      ) : (
                        <span className="record-status">{micSupported ? "Tap to record a voice memory" : "Recording isn't supported here"}</span>
                      )}
                    </div>
                    {micError && <div className="mic-error">{micError}</div>}
                  </div>

                  <div className="clear-day-row">
                    <button className={`text-link${confirmClearDay ? " danger" : ""}`} onClick={handleClearDay}>
                      {confirmClearDay ? "Really clear this whole day? Click again to confirm" : "Clear this day"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`panel-frame${flipped ? " show" : ""}`} aria-hidden="true">
            <div className="frame-branch" />
            <div className="frame-rope frame-rope-left">
              <span className="rope-leaf" style={{ top: "8px" }}>🌿</span>
              <span className="rope-leaf" style={{ top: "22px" }}>🍃</span>
            </div>
            <div className="frame-rope frame-rope-right">
              <span className="rope-leaf" style={{ top: "14px" }}>🍃</span>
              <span className="rope-leaf" style={{ top: "28px" }}>🌿</span>
            </div>

            <div className="frame-corner tl">
              <span className="fc-leaf">🌿</span>
              <span className="fc-flower">{seasonCfg.flora[0]}</span>
            </div>
            <div className="frame-corner tr">
              <span className="fc-flower">{seasonCfg.flora[1] || seasonCfg.flora[0]}</span>
              <span className="fc-leaf">🍃</span>
            </div>
            <div className="frame-corner bl">
              <span className="fc-flower">{seasonCfg.flora[2] || seasonCfg.flora[0]}</span>
              <span className="fc-leaf">🌿</span>
            </div>
            <div className="frame-corner br">
              <span className="fc-leaf">🍃</span>
              <span className="fc-flower">{seasonCfg.flora[0]}</span>
            </div>

            <div className="frame-vine frame-vine-left">🌿</div>
            <div className="frame-vine frame-vine-right">🌿</div>

            <div className="butterfly bf-1"><span className="bf-flap">🦋</span></div>
            <div className="butterfly bf-2"><span className="bf-flap">🦋</span></div>
            <div className="butterfly bf-3"><span className="bf-flap">🦋</span></div>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div className={`lightbox-overlay${lightboxShow ? " show" : ""}`} onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox} aria-label="Close image">×</button>
          <img className="lightbox-img" src={lightboxUrl} alt="Memory" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
