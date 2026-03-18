import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Cpu,
  Flame,
  Gauge,
  MoveRight,
  Sparkles,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function SlidingButton({
  children,
  variant,
  onClick,
}: {
  children: React.ReactNode;
  variant: "moss" | "clay" | "ghost";
  onClick?: () => void;
}) {
  const base =
    "group nura-magnetic relative overflow-hidden rounded-full px-5 py-3 text-sm font-semibold tracking-tight transition-transform duration-300";

  if (variant === "ghost") {
    return (
      <button
        onClick={onClick}
        className={cx(
          base,
          "border border-white/20 bg-white/5 text-white hover:bg-white/10"
        )}
      >
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }

  const bg = variant === "moss" ? "bg-nura-moss" : "bg-nura-clay";
  const fg = "text-nura-cream";

  return (
    <button
      onClick={onClick}
      className={cx(base, bg, fg, "shadow-[0_18px_60px_rgba(0,0,0,0.22)]")}
    >
      <span className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

function FloatingNavbar({
  scrolled,
  onNav,
}: {
  scrolled: boolean;
  onNav: (id: string) => void;
}) {
  return (
    <div className="fixed left-1/2 top-4 z-50 w-[min(1100px,94vw)] -translate-x-1/2">
      <div
        className={cx(
          "mx-auto flex items-center justify-between rounded-full px-5 py-3 transition-all duration-500",
          scrolled
            ? "border border-black/10 bg-white/60 text-nura-moss shadow-[0_20px_80px_rgba(0,0,0,0.14)] backdrop-blur-xl"
            : "border border-white/10 bg-transparent text-white"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cx(
              "grid h-9 w-9 place-items-center rounded-full",
              scrolled ? "bg-nura-moss/10" : "bg-white/10"
            )}
          >
            <Sparkles className={cx("h-4 w-4", scrolled ? "text-nura-moss" : "text-white")} />
          </div>
          <div className={cx("text-sm font-extrabold tracking-tight", scrolled ? "text-nura-moss" : "text-white")}>
            Nura Health
          </div>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {[
            { id: "features", label: "Artifacts" },
            { id: "philosophy", label: "Philosophy" },
            { id: "protocol", label: "Protocol" },
            { id: "membership", label: "Membership" },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => onNav(l.id)}
              className={cx(
                "text-sm font-semibold tracking-tight transition-opacity hover:opacity-100",
                scrolled ? "text-nura-moss/80" : "text-white/80"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cx(
              "hidden text-xs font-semibold tracking-tight md:inline",
              scrolled ? "text-nura-moss/70" : "text-white/70"
            )}
          >
            Clinical Boutique
          </span>
          <div
            className={cx(
              "h-8 w-px",
              scrolled ? "bg-nura-moss/15" : "bg-white/20"
            )}
          />
          <a
            href="#membership"
            className={cx(
              "rounded-full px-4 py-2 text-xs font-bold tracking-tight transition-colors",
              scrolled
                ? "bg-nura-moss text-nura-cream hover:bg-nura-moss/90"
                : "bg-white/10 text-white hover:bg-white/15"
            )}
          >
            Join
          </a>
        </div>
      </div>
    </div>
  );
}

function DiagnosticShuffler() {
  const [stack, setStack] = useState<string[]>([
    "Epigenetic Age",
    "Microbiome Score",
    "Cortisol Optimization",
  ]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStack((s) => {
        const next = [...s];
        const last = next.pop();
        if (last) next.unshift(last);
        return next;
      });
      setTick((t) => t + 1);
    }, 3000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative h-44 w-full">
      {stack.map((label, idx) => {
        const depth = idx;
        const y = depth * 10;
        const scale = 1 - depth * 0.03;
        const z = 30 - depth;

        return (
          <div
            key={`${label}-${tick}-${idx}`}
            className="absolute left-0 top-0 w-full rounded-3xl border border-black/10 bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
            style={{
              transform: `translateY(${y}px) scale(${scale})`,
              zIndex: z,
              transitionProperty: "transform",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
              transitionDuration: "700ms",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.2em] text-black/40">
                  AUDIT INTELLIGENCE
                </div>
                <div className="mt-2 text-lg font-extrabold tracking-tight text-nura-charcoal">
                  {label}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-nura-moss/10">
                <Gauge className="h-5 w-5 text-nura-moss" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {["SNR", "Range", "Bias"].map((k) => (
                <div
                  key={k}
                  className="rounded-2xl bg-black/[0.03] px-3 py-2"
                >
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-black/40">
                    {k}
                  </div>
                  <div className="mt-1 font-mono text-xs font-semibold text-black/70">
                    {k === "SNR" ? "37.2dB" : k === "Range" ? "0.14–0.91" : "±0.02"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TelemetryTypewriter() {
  const messages = useMemo(
    () => [
      "Optimizing Circadian Rhythm…",
      "Recalibrating Glucose Response…",
      "Sequencing Sleep Architecture…",
      "Stabilizing Cortisol Peaks…",
      "Aligning Training Load…",
    ],
    []
  );

  const [msgIndex, setMsgIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = messages[msgIndex] ?? "";

    const speed = isDeleting ? 24 : 38;
    const id = window.setTimeout(() => {
      if (!isDeleting) {
        if (cursor < current.length) {
          setCursor((c) => c + 1);
        } else {
          window.setTimeout(() => setIsDeleting(true), 900);
        }
      } else {
        if (cursor > 0) {
          setCursor((c) => c - 1);
        } else {
          setIsDeleting(false);
          setMsgIndex((i) => (i + 1) % messages.length);
        }
      }
    }, speed);

    return () => window.clearTimeout(id);
  }, [cursor, isDeleting, msgIndex, messages]);

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.2em] text-black/40">
            NEURAL STREAM
          </div>
          <div className="mt-2 text-lg font-extrabold tracking-tight text-nura-charcoal">
            Live Telemetry
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nura-clay/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-nura-clay" />
          </span>
          <span className="text-xs font-semibold text-black/60">Live Feed</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-nura-charcoal px-4 py-4">
        <div className="font-mono text-xs text-nura-cream/80">$ nura.telemetry</div>
        <div className="mt-2 font-mono text-sm text-nura-cream">
          {messages[msgIndex]?.slice(0, cursor)}
          <span className="ml-0.5 inline-block w-2 animate-pulse text-nura-clay">
            ▍
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { k: "HRV", v: "72ms" },
            { k: "SpO₂", v: "98%" },
            { k: "Temp", v: "36.6°C" },
          ].map((i) => (
            <div key={i.k} className="rounded-xl bg-white/5 px-3 py-2">
              <div className="text-[10px] font-semibold tracking-[0.18em] text-nura-cream/60">
                {i.k}
              </div>
              <div className="mt-1 font-mono text-xs font-semibold text-nura-cream">
                {i.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CursorProtocolScheduler() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<SVGSVGElement | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (!rootRef.current || !cursorRef.current) return;

    const days = Array.from(rootRef.current.querySelectorAll("[data-day]"));
    const save = rootRef.current.querySelector("[data-save]") as HTMLElement | null;
    if (days.length === 0 || !save) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
      gsap.set(cursorRef.current, { opacity: 0, scale: 1, x: 0, y: 0 });

      days.forEach((d, idx) => {
        const r = (d as HTMLElement).getBoundingClientRect();
        const parent = rootRef.current!.getBoundingClientRect();
        const x = r.left - parent.left + r.width * 0.75;
        const y = r.top - parent.top + r.height * 0.9;

        tl.to(cursorRef.current, { opacity: 1, duration: 0.2 }, idx === 0 ? 0 : undefined);
        tl.to(cursorRef.current, { x, y, duration: 0.7, ease: "power2.out" });
        tl.to(cursorRef.current, { scale: 0.92, duration: 0.09, ease: "power2.out" });
        tl.to(cursorRef.current, { scale: 1, duration: 0.16, ease: "power2.out" });
        tl.call(() => setActiveDay(idx));
      });

      const saveR = save.getBoundingClientRect();
      const parentR = rootRef.current!.getBoundingClientRect();
      tl.to(cursorRef.current, {
        x: saveR.left - parentR.left + saveR.width * 0.7,
        y: saveR.top - parentR.top + saveR.height * 0.9,
        duration: 0.8,
        ease: "power2.out",
      });
      tl.to(cursorRef.current, { scale: 0.9, duration: 0.1 });
      tl.to(cursorRef.current, { scale: 1, duration: 0.2 });
      tl.to(cursorRef.current, { opacity: 0, duration: 0.3 });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.2em] text-black/40">
            ADAPTIVE REGIMEN
          </div>
          <div className="mt-2 text-lg font-extrabold tracking-tight text-nura-charcoal">
            Protocol Scheduler
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-nura-moss/10">
          <Cpu className="h-5 w-5 text-nura-moss" />
        </div>
      </div>

      <div
        ref={rootRef}
        className="relative mt-5 rounded-2xl bg-black/[0.03] p-4"
      >
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, idx) => (
            <div
              key={`${d}-${idx}`}
              data-day
              className={cx(
                "grid aspect-square place-items-center rounded-2xl border text-sm font-bold transition-colors",
                idx === activeDay
                  ? "border-nura-moss bg-nura-moss text-nura-cream"
                  : "border-black/10 bg-white text-nura-charcoal"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs font-semibold tracking-tight text-black/60">
            Weekly cadence locked
          </div>
          <button
            data-save
            className="nura-magnetic rounded-full bg-nura-clay px-4 py-2 text-xs font-extrabold tracking-tight text-nura-cream"
          >
            Save
          </button>
        </div>

        <svg
          ref={cursorRef}
          width="26"
          height="26"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-0 top-0"
        >
          <path
            d="M4 3l7 18 2-7 7-2L4 3z"
            fill="#CC5833"
            stroke="#1A1A1A"
            strokeWidth="0.6"
          />
        </svg>
      </div>
    </div>
  );
}

function HelixArtifact() {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(".helix-gear", {
        rotate: 360,
        transformOrigin: "50% 50%",
        duration: 10,
        ease: "none",
        repeat: -1,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 200 200"
      className="h-48 w-48"
      aria-hidden
    >
      <defs>
        <linearGradient id="hg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#CC5833" stopOpacity="0.8" />
          <stop offset="1" stopColor="#2E4036" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="64" fill="none" stroke="url(#hg)" strokeWidth="10" className="helix-gear" />
      <path
        d="M75 45c40 30 10 40 50 70s10 40 50 70"
        fill="none"
        stroke="#F2F0E9"
        strokeOpacity="0.65"
        strokeWidth="2"
      />
      <path
        d="M125 45c-40 30-10 40-50 70s-10 40-50 70"
        fill="none"
        stroke="#F2F0E9"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
    </svg>
  );
}

function LaserGridArtifact() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(".laser", {
        xPercent: 120,
        duration: 1.9,
        ease: "power2.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="relative h-56 w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(204,88,51,0.35),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(46,64,54,0.4),transparent_55%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(242,240,233,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(242,240,233,0.12)_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="laser absolute left-[-40%] top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-nura-clay/70 to-transparent blur-sm" />

      <div className="absolute inset-4 grid grid-cols-6 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}

function EkgArtifact() {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      const path = ref.current!.querySelector("path");
      if (!path) return;
      const len = (path as SVGPathElement).getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut", repeat: -1 });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 400 120" className="h-24 w-full" aria-hidden>
      <path
        d="M0 70h60l15-25 20 55 25-70 30 90 30-60 18 10 25-25h177"
        fill="none"
        stroke="#CC5833"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProtocolStack() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!wrapRef.current) return;

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      cards.forEach((card, idx) => {
        if (idx === 0) return;

        const prev = cards[idx - 1];
        ScrollTrigger.create({
          trigger: card,
          start: "top 65%",
          end: "top 20%",
          scrub: true,
          animation: gsap
            .timeline()
            .to(prev, { scale: 0.9, filter: "blur(20px)", opacity: 0.5, ease: "none" }, 0),
        });
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const cards = [
    {
      title: "Genomic Mechanics",
      desc: "A rotational model of biological leverage points — engineered for repeatability.",
      media: <HelixArtifact />,
      icon: <Flame className="h-4 w-4" />,
    },
    {
      title: "Cellular Scan",
      desc: "A weighted scan of your system architecture — noise removed, signal extracted.",
      media: <LaserGridArtifact />,
      icon: <Circle className="h-4 w-4" />,
    },
    {
      title: "Cardiac Output",
      desc: "A living waveform — protocol intensity tuned to recovery.",
      media: <EkgArtifact />,
      icon: <Gauge className="h-4 w-4" />,
    },
  ];

  return (
    <div ref={wrapRef} className="space-y-10">
      {cards.map((c, idx) => (
        <div
          key={c.title}
          ref={(el) => {
            cardRefs.current[idx] = el;
          }}
          className="sticky top-0"
        >
          <div className="min-h-[100vh] px-4 pb-10 pt-28">
            <div className="mx-auto w-[min(1100px,94vw)] rounded-[3rem] border border-white/10 bg-nura-charcoal/90 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
              <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold tracking-[0.18em] text-white/70">
                    <span className="text-nura-clay">{c.icon}</span>
                    PROTOCOL CARD {idx + 1}
                  </div>
                  <div className="mt-6 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                    {c.title}
                  </div>
                  <div className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
                    {c.desc}
                  </div>

                  <div className="mt-8 flex items-center gap-3">
                    <div className="rounded-2xl bg-white/5 px-4 py-3">
                      <div className="text-[10px] font-semibold tracking-[0.2em] text-white/50">
                        LATENCY
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold text-white">
                        18ms
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3">
                      <div className="text-[10px] font-semibold tracking-[0.2em] text-white/50">
                        SIGNAL
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold text-white">
                        0.92
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-md">
                  <div className="rounded-3xl bg-white/5 p-6">
                    {c.media}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NuraLandingPage() {
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(".hero-line", { opacity: 0, y: 24 });
      gsap.to(".hero-line", {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.2,
      });

      const manifesto = rootRef.current!.querySelector("[data-manifesto]");
      if (manifesto) {
        const lines = manifesto.querySelectorAll("[data-reveal] span");
        gsap.set(lines, { yPercent: 110, opacity: 0 });
        gsap.to(lines, {
          yPercent: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.02,
          scrollTrigger: {
            trigger: manifesto,
            start: "top 70%",
          },
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-nura-cream text-nura-charcoal">
      <div className="nura-noise" />
      <FloatingNavbar scrolled={scrolled} onNav={scrollTo} />

      <section
        className="relative min-h-[100dvh] overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(46,64,54,0.86) 0%, rgba(26,26,26,0.92) 70%), url(https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?auto=format&fit=crop&w=2400&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(204,88,51,0.18),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-[100dvh] w-[min(1200px,94vw)] items-end pb-20">
          <div className="max-w-2xl">
            <div className="hero-line inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold tracking-[0.18em] text-white/80">
              <span className="h-2 w-2 rounded-full bg-nura-clay" />
              CLINICAL TELEMETRY · ORGANIC INTELLIGENCE
            </div>

            <div className="mt-8">
              <div className="hero-line text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                Nature is the
              </div>
              <div className="hero-line mt-3 font-cormorant text-5xl italic tracking-tight text-white sm:text-7xl">
                Algorithm.
              </div>
              <div className="hero-line mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
                Nura Health is a high-fidelity protocol engine: part biological research lab,
                part luxury instrument. We translate your signals into a weighted regimen you
                can execute.
              </div>
            </div>

            <div className="hero-line mt-10 flex flex-wrap items-center gap-3">
              <SlidingButton variant="clay" onClick={() => setLocation("/auth?mode=signup")}>
                Start Membership <ArrowRight className="h-4 w-4" />
              </SlidingButton>
              <SlidingButton variant="ghost" onClick={() => scrollTo("features")}>
                Explore Artifacts <ChevronRight className="h-4 w-4" />
              </SlidingButton>
              <button
                onClick={() => setLocation("/auth")}
                className="nura-magnetic rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold tracking-tight text-white/80 hover:bg-white/10"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative py-24">
        <div className="mx-auto w-[min(1200px,94vw)]">
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
            <div className="max-w-xl">
              <div className="text-xs font-extrabold tracking-[0.24em] text-nura-moss/70">
                PRECISION MICRO-UI DASHBOARD
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-nura-charcoal md:text-5xl">
                Functional artifacts.
              </div>
              <div className="mt-4 text-base leading-relaxed text-black/60">
                These are not marketing cards. They behave like software: cycling stacks,
                live feeds, and protocol scheduling.
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold tracking-[0.18em] text-black/60">
              <MoveRight className="h-4 w-4 text-nura-clay" />
              INTERACTIVE
            </div>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[3rem] bg-white/60 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <DiagnosticShuffler />
            </div>
            <div className="rounded-[3rem] bg-white/60 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <TelemetryTypewriter />
            </div>
            <div className="rounded-[3rem] bg-white/60 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <CursorProtocolScheduler />
            </div>
          </div>
        </div>
      </section>

      <section
        id="philosophy"
        data-manifesto
        className="relative overflow-hidden bg-nura-charcoal py-28 text-white"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(26,26,26,0.92) 0%, rgba(26,26,26,0.88) 100%), url(https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=2400&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="mx-auto w-[min(1200px,94vw)]">
          <div className="max-w-5xl">
            <div className="text-xs font-extrabold tracking-[0.24em] text-white/60">
              THE MANIFESTO
            </div>

            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <div className="space-y-4">
                <div data-reveal className="overflow-hidden">
                  <span className="block text-4xl font-extrabold tracking-tight md:text-6xl">
                    Modern medicine asks:
                  </span>
                </div>
                <div data-reveal className="overflow-hidden">
                  <span className="block text-4xl font-extrabold tracking-tight text-white/60 md:text-6xl">
                    What is wrong?
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div data-reveal className="overflow-hidden">
                  <span className="block text-4xl font-extrabold tracking-tight md:text-6xl">
                    We ask:
                  </span>
                </div>
                <div data-reveal className="overflow-hidden">
                  <span className="block font-cormorant text-5xl italic tracking-tight text-nura-clay md:text-7xl">
                    What is optimal?
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-2xl text-base leading-relaxed text-white/70">
              Our work lives in the margin between laboratory rigor and human execution.
              Not diagnosis — design. Not fear — cadence.
            </div>
          </div>
        </div>
      </section>

      <section id="protocol" className="relative bg-nura-charcoal">
        <div className="mx-auto w-[min(1200px,94vw)] pt-24">
          <div className="max-w-2xl">
            <div className="text-xs font-extrabold tracking-[0.24em] text-white/60">
              STICKY STACKING ARCHIVE
            </div>
            <div className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              The protocol is a scroll instrument.
            </div>
            <div className="mt-4 text-base leading-relaxed text-white/70">
              Each layer weights the one beneath it — scale, blur, and opacity behave like
              depth-of-field.
            </div>
          </div>
        </div>

        <ProtocolStack />
      </section>

      <section id="membership" className="relative bg-nura-cream py-28">
        <div className="mx-auto w-[min(1200px,94vw)]">
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
            <div className="max-w-xl">
              <div className="text-xs font-extrabold tracking-[0.24em] text-nura-moss/70">
                MEMBERSHIP
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
                Choose your operating mode.
              </div>
              <div className="mt-4 text-base leading-relaxed text-black/60">
                Three tiers. The middle plan is tuned for performance.
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              {
                name: "Foundation",
                price: "$39/mo",
                desc: "Baseline protocol and core telemetry.",
                featured: false,
              },
              {
                name: "Performance",
                price: "$89/mo",
                desc: "Adaptive regimen, live feed, deep audits.",
                featured: true,
              },
              {
                name: "Concierge",
                price: "$199/mo",
                desc: "Boutique clinical partnership.",
                featured: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={cx(
                  "rounded-[3rem] border p-8 shadow-[0_30px_90px_rgba(0,0,0,0.08)]",
                  p.featured
                    ? "border-nura-moss bg-nura-moss text-nura-cream"
                    : "border-black/10 bg-white"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={cx("text-xs font-extrabold tracking-[0.24em]", p.featured ? "text-white/70" : "text-black/40")}>
                      {p.name.toUpperCase()}
                    </div>
                    <div className="mt-3 text-4xl font-extrabold tracking-tight">
                      {p.price}
                    </div>
                    <div className={cx("mt-3 text-sm leading-relaxed", p.featured ? "text-white/80" : "text-black/60")}>
                      {p.desc}
                    </div>
                  </div>

                  <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", p.featured ? "bg-white/10" : "bg-nura-moss/10")}>
                    <Sparkles className={cx("h-5 w-5", p.featured ? "text-white" : "text-nura-moss")} />
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {["Protocol library", "Weekly calibration", "Telemetry dashboard"].map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className={cx("grid h-7 w-7 place-items-center rounded-full", p.featured ? "bg-white/10" : "bg-black/[0.04]")}>
                        <Check className={cx("h-4 w-4", p.featured ? "text-white" : "text-nura-moss")} />
                      </div>
                      <div className={cx("text-sm font-semibold", p.featured ? "text-white/85" : "text-black/70")}>
                        {f}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  {p.featured ? (
                    <button
                      onClick={() => setLocation("/auth?mode=signup")}
                      className="nura-magnetic w-full rounded-full bg-nura-clay px-5 py-3 text-sm font-extrabold tracking-tight text-nura-cream"
                    >
                      Activate Performance
                    </button>
                  ) : (
                    <button
                      onClick={() => setLocation("/auth?mode=signup")}
                      className="nura-magnetic w-full rounded-full bg-nura-moss px-5 py-3 text-sm font-extrabold tracking-tight text-nura-cream"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="rounded-t-[4rem] bg-nura-charcoal px-4 py-16 text-white">
        <div className="mx-auto w-[min(1200px,94vw)]">
          <div className="flex flex-col justify-between gap-12 md:flex-row">
            <div className="max-w-md">
              <div className="text-lg font-extrabold tracking-tight">Nura Health</div>
              <div className="mt-4 text-sm leading-relaxed text-white/70">
                A digital instrument for biological optimization — designed with laboratory
                rigor and luxury restraint.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              {[
                {
                  title: "Product",
                  links: ["Artifacts", "Protocol", "Membership"],
                },
                {
                  title: "Company",
                  links: ["Ethos", "Security", "Contact"],
                },
                {
                  title: "Legal",
                  links: ["Privacy", "Terms", "Compliance"],
                },
              ].map((g) => (
                <div key={g.title}>
                  <div className="text-xs font-extrabold tracking-[0.24em] text-white/50">
                    {g.title}
                  </div>
                  <div className="mt-4 space-y-3">
                    {g.links.map((l) => (
                      <a
                        key={l}
                        href="#"
                        className="block text-sm font-semibold text-white/70 transition-colors hover:text-white"
                      >
                        {l}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center">
            <div className="text-sm font-semibold text-white/60">
              © {new Date().getFullYear()} Nura Health. All rights reserved.
            </div>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-extrabold tracking-[0.18em] text-white/70">
                SYSTEM OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
