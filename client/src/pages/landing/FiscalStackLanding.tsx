import { useState, useEffect, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { useBranding } from "@/hooks/use-branding";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  navy:      "#0D1B2A",
  gold:      "#2563EB",
  goldLight: "#3B82F6",
  slate:     "#1E2D3D",
  ash:       "#F0EEE9",
  steel:     "#6B7F96",
  emerald:   "#16A34A",
  charcoal:  "#0A0F14",
  white:     "#FFFFFF",
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────────
interface PlanType {
  name: string;
  badge: string | null;
  price: string;
  unit: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

interface FaqType {
  q: string;
  a: string;
}

interface MessageType {
  from: "bot" | "user";
  text: string;
}

interface FeatureItem {
  icon: string;
  tag: string;
  title: string;
  desc: string;
  color: string;
}

// ─── Config — update these to match your project ───────────────────────────────
const WHATSAPP_NUMBER = "263771234567"; // e.g. 263771234567 (no + or spaces)
const WHATSAPP_MESSAGE = (brandName: string) => encodeURIComponent(`Hi ${brandName}! I'd like to learn more about your fiscalization platform.`);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

// ── Google Fonts ────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,300;1,500;1,600&family=DM+Mono:wght@300;400;500&display=swap"
  />
);

// ── Noise overlay ───────────────────────────────────────────────────────────────
const Noise = () => (
  <svg
    className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.032]"
    style={{ mixBlendMode: "overlay" } as CSSProperties}
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
  >
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" />
  </svg>
);

// ── Navbar ──────────────────────────────────────────────────────────────────────
const Navbar = () => {
  const { brand } = useBranding();
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["Features", "Pricing", "FAQ"];

  return (
    <nav
      className="fixed top-4 left-1/2 z-50 flex items-center justify-between px-5 py-3 transition-all duration-500"
      style={{
        transform: "translateX(-50%)",
        width: scrolled ? "min(760px, 94vw)" : "min(960px, 96vw)",
        borderRadius: 9999,
        background: scrolled ? "rgba(240,238,233,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(28px)" : "none",
        border: scrolled ? "1px solid rgba(37,99,235,0.18)" : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 48px rgba(0,0,0,0.13)" : "none",
      }}
    >
      {/* Logo */}
      <img
        src={brand.logo}
        alt={brand.name}
        style={{ height: 34, width: "auto" }}
      />

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-6">
        {links.map(l => (
          <a key={l} href={`#${l.toLowerCase()}`} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500, color: scrolled ? C.slate : "rgba(255,255,255,0.78)", textDecoration: "none", transition: "color 0.2s" }}>
            {l}
          </a>
        ))}
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={() => setLocation("/auth")}
          style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: scrolled ? C.slate : "rgba(255,255,255,0.8)", background: "none", border: "none", cursor: "pointer", textDecoration: "none" }}
        >
          Sign In
        </button>
        <button
          onClick={() => setLocation("/auth?mode=signup")}
          style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, padding: "8px 20px", borderRadius: 9999, background: C.gold, color: "#fff", border: "none", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 2px 12px rgba(37,99,235,0.35)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          Get Started
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden"
        onClick={() => setMenuOpen(m => !m)}
        style={{ background: "none", border: "none", cursor: "pointer", color: scrolled ? C.navy : "#fff", fontSize: 22 }}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "rgba(240,238,233,0.97)", backdropFilter: "blur(20px)", borderRadius: 20, border: "1px solid rgba(37,99,235,0.18)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 500, color: C.slate, textDecoration: "none" }}>{l}</a>
          ))}
          <hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.08)" }} />
          <button onClick={() => { setLocation("/auth"); setMenuOpen(false); }} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: C.slate, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>Sign In</button>
          <button onClick={() => { setLocation("/auth?mode=signup"); setMenuOpen(false); }} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, padding: "10px", borderRadius: 9999, background: C.gold, color: "#fff", border: "none", cursor: "pointer" }}>Get Started</button>
        </div>
      )}
    </nav>
  );
};

// ── Live Invoice Widget ─────────────────────────────────────────────────────────
const InvoiceWidget = () => (
  <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", width: 280, padding: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", position: "relative" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.steel, letterSpacing: "0.1em", marginBottom: 2 }}>TechSolutions Ltd</div>
        <div style={{ fontSize: 9, color: "#aaa", fontFamily: "'DM Mono',monospace" }}>VAT: 123456789</div>
      </div>
      <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 99, letterSpacing: "0.08em" }}>FISCALIZED</span>
    </div>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 10 }}>#INV-2024-001</div>
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
          <th style={{ textAlign: "left", fontSize: 9, color: "#aaa", fontWeight: 500, padding: "3px 0", fontFamily: "'DM Mono',monospace" }}>DESCRIPTION</th>
          <th style={{ textAlign: "right", fontSize: 9, color: "#aaa", fontWeight: 500, padding: "3px 0", fontFamily: "'DM Mono',monospace" }}>AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        {([["Web Development", "$1,200.00"], ["Hosting (Yearly)", "$250.00"], ["Maintenance", "$1,000.00"]] as [string, string][]).map(([d, a]) => (
          <tr key={d}>
            <td style={{ fontSize: 10, color: C.slate, padding: "4px 0" }}>{d}</td>
            <td style={{ fontSize: 10, color: C.slate, textAlign: "right", fontFamily: "'DM Mono',monospace" }}>{a}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
      {([["Subtotal", "$2,450.00", false], ["VAT (15%)", "$367.50", false], ["Total", "$2,817.50", true]] as [string, string, boolean][]).map(([l, v, bold]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: bold ? 11 : 9, fontWeight: bold ? 700 : 400, color: bold ? C.navy : "#aaa", fontFamily: bold ? "'Plus Jakarta Sans',sans-serif" : "'DM Mono',monospace" }}>{l}</span>
          <span style={{ fontSize: bold ? 11 : 9, fontWeight: bold ? 700 : 400, color: bold ? C.gold : "#aaa", fontFamily: "'DM Mono',monospace" }}>{v}</span>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 12, padding: "8px", background: C.ash, borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 9, color: C.steel, fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>Scan to verify Fiscal Signature</div>
      <div style={{ width: 44, height: 44, margin: "0 auto", background: C.navy, borderRadius: 4, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, padding: 4 }}>
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} style={{ background: i % 3 === 0 || i % 5 === 0 ? "#fff" : "transparent", borderRadius: 1 }} />
        ))}
      </div>
    </div>
    {/* FDMS badge */}
    <div style={{ position: "absolute", top: -12, right: 16, background: C.navy, borderRadius: 99, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
      <span style={{ fontSize: 9, color: "#fff", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em" }}>FDMS Connected</span>
    </div>
  </div>
);

// ── Hero ────────────────────────────────────────────────────────────────────────
const Hero = () => {
  const { brand } = useBranding();
  const [, setLocation] = useLocation();
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 80);
    return () => clearTimeout(t);
  }, []);

  const fu = (d: number): CSSProperties => ({
    opacity: vis ? 1 : 0,
    transform: vis ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.85s ease ${d}s, transform 0.85s ease ${d}s`,
  });

  return (
    <section style={{ minHeight: "100dvh", background: C.navy, position: "relative", display: "flex", alignItems: "center", overflow: "hidden", padding: "100px 0 60px" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 70% 50%, rgba(37,99,235,0.1) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 10% 80%, rgba(26,107,82,0.1) 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: "10%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.1)", transform: "rotate(-15deg)" }} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", width: "100%", display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ ...fu(0.1), display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: 9999, padding: "5px 14px", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.gold, letterSpacing: "0.12em" }}>ZIMRA COMPLIANT · ZIMBABWE</span>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1 }}>
            <span style={{ ...fu(0.2), display: "block", fontSize: "clamp(2.6rem,5.5vw,4.2rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              {brand.name}
            </span>
            <em style={{ ...fu(0.35), display: "block", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(3rem,6.5vw,5.2rem)", color: C.gold, letterSpacing: "-0.02em", lineHeight: 1 }}>
              Reimagined.
            </em>
          </h1>

          <p style={{ ...fu(0.5), fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, color: "rgba(255,255,255,0.52)", lineHeight: 1.7, maxWidth: 480, marginTop: 20 }}>
            The all-in-one fiscalization platform for Zimbabwe's modern businesses. Seamlessly sync with ZIMRA, manage inventory, and drive growth with smart analytics.
          </p>

          <div style={{ ...fu(0.65), display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <button
              onClick={() => setLocation("/auth?mode=signup")}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, padding: "13px 28px", borderRadius: 9999, background: C.gold, color: "#fff", border: "none", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 20px rgba(37,99,235,0.4)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(37,99,235,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(37,99,235,0.4)"; }}
            >
              Start Free Trial
            </button>
            <button
              onClick={() => setLocation("/auth?mode=signup")}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 14, padding: "13px 28px", borderRadius: 9999, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
            >
              Book a Demo →
            </button>
          </div>

          <div style={{ ...fu(0.8), display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
            <div style={{ display: "flex" }}>
              {["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a"].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid " + C.navy, marginLeft: i > 0 ? -8 : 0 }} />
              ))}
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              Trusted by <strong style={{ color: "rgba(255,255,255,0.75)" }}>500+</strong> businesses
            </span>
          </div>
        </div>

        {/* Right — invoice widget */}
        <div style={{ ...fu(0.45), display: "flex", justifyContent: "center" }} className="hidden lg:flex">
          <InvoiceWidget />
        </div>
      </div>

      {/* Bottom stats */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between" }}>
          {([["500+", "Businesses Active"], ["$12M+", "Invoices Processed"], ["99.9%", "FDMS Uptime"], ["< 1s", "Sync Latency"]] as [string, string][]).map(([v, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, color: C.gold }}>{v}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Features ────────────────────────────────────────────────────────────────────
const featureList: FeatureItem[] = [
  { icon: "🏛️", tag: "COMPLIANCE",   title: "ZIMRA Compliant",      desc: "Always up to date with the latest tax regulations. Automatic updates keep you compliant without lifting a finger.", color: "#16a34a" },
  { icon: "📡", tag: "INTEGRATION",  title: "FDMS Sync",            desc: "Real-time fiscal device synchronization with Zimbabwe's FDMS infrastructure. Zero manual steps.", color: C.gold },
  { icon: "⬡",  tag: "VERIFICATION", title: "Smart QR Codes",       desc: "Every invoice embeds a cryptographically signed fiscal QR code for instant ZIMRA verification.", color: "#7c3aed" },
  { icon: "🧮", tag: "AUTOMATION",   title: "Auto-Tax Engine",       desc: "VAT, withholding tax, and multiple rate tiers — calculated automatically on every transaction.", color: "#2563eb" },
  { icon: "🖥️", tag: "POINT OF SALE",title: "Smart POS · Offline",  desc: "Complete offline-capable POS for retail. Queues transactions locally, syncs the moment connectivity returns.", color: "#db2777" },
  { icon: "📦", tag: "STOCK CONTROL",title: "Inventory Management", desc: "Track stock levels, set reorder alerts, and manage products across multiple locations in real time.", color: "#ea580c" },
  { icon: "✉️", tag: "COMMUNICATION",title: "Email Hosting",         desc: "Professional business email under your domain — fully integrated with invoicing and client communications.", color: "#0ea5e9" },
  { icon: "📊", tag: "ANALYTICS",    title: "Smart Analytics",       desc: "Revenue trends, tax liabilities, and growth insights — presented in clear dashboards built for action.", color: C.goldLight },
];

const Features = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <section id="features" style={{ background: C.ash, padding: "100px 24px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.18em", color: C.steel, display: "block", marginBottom: 12 }}>POWER FEATURES</span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Everything you need{" "}
            <em style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: "italic", color: C.gold }}>to succeed.</em>
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, color: C.steel, marginTop: 14, maxWidth: 480, margin: "14px auto 0" }}>
            Built for speed, compliance, and growth.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {featureList.map((f, i) => (
            <div
              key={f.title}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === i ? C.navy : "#fff",
                border: `1px solid ${hovered === i ? "transparent" : "rgba(13,27,42,0.07)"}`,
                borderRadius: 24,
                padding: "28px 24px",
                cursor: "default",
                transition: "all 0.35s ease",
                transform: hovered === i ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hovered === i ? "0 20px 60px rgba(0,0,0,0.18)" : "none",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 16 }}>
                {f.icon}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.14em", color: hovered === i ? f.color : C.steel, marginBottom: 8 }}>{f.tag}</div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: hovered === i ? "#fff" : C.navy, letterSpacing: "-0.02em", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, lineHeight: 1.65, color: hovered === i ? "rgba(255,255,255,0.55)" : C.steel }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── POS Highlight ───────────────────────────────────────────────────────────────
const POSHighlight = () => {
  const { brand } = useBranding();
  const [status, setStatus] = useState<"online" | "offline">("online");
  const [queue, setQueue] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setStatus(s => s === "online" ? "offline" : "online");
      setQueue(q => q === 0 ? 3 : 0);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section style={{ background: C.navy, padding: "100px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 70% at 90% 50%, rgba(37,99,235,0.08) 0%, transparent 70%)` }} />
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="grid-cols-1 md:grid-cols-2">

        {/* POS Mock */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: 28, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Smart POS Terminal</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: status === "online" ? "rgba(22,163,74,0.15)" : "rgba(239,68,68,0.15)", padding: "4px 10px", borderRadius: 99 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "online" ? "#22c55e" : "#ef4444", animation: "pulse 1.5s infinite", display: "inline-block" }} />
              <span style={{ fontSize: 10, color: status === "online" ? "#22c55e" : "#ef4444", fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
                {status === "online" ? "Online · Synced" : "Offline · Queued"}
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {["Bread — $0.80", "Milk — $1.20", "Eggs ×6 — $2.50", "Sugar 1kg — $1.00", "Cooking Oil — $3.40", "Chicken — $5.80"].map(item => (
              <div key={item} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 8px", fontSize: 10, color: "rgba(255,255,255,0.65)", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                {item}
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(37,99,235,0.08)", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: C.steel, marginBottom: 2 }}>Cart Total (incl. VAT)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.gold, fontFamily: "'DM Mono',monospace" }}>$14.70</div>
            </div>
            <button style={{ background: C.gold, color: "#fff", fontWeight: 700, fontSize: 12, padding: "10px 18px", borderRadius: 99, border: "none", cursor: "pointer" }}>
              Fiscalize & Print
            </button>
          </div>
          {queue > 0 && (
            <div style={{ marginTop: 12, fontSize: 11, color: "rgba(239,68,68,0.8)", fontFamily: "'DM Mono',monospace", textAlign: "center" }}>
              ⚡ {queue} transactions queued — will sync when online
            </div>
          )}
        </div>

        {/* Text */}
        <div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.18em", color: "rgba(37,99,235,0.7)", display: "block", marginBottom: 14 }}>POINT OF SALE</span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 16 }}>
            Works offline.{" "}
            <em style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: "italic", color: C.gold }}>Syncs instantly.</em>
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 24 }}>
            Internet outages shouldn't stop your business. {brand.name}'s POS operates fully offline — recording every sale, printing receipts, and queuing FDMS submissions until connectivity returns.
          </p>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Instant FDMS sync when back online", "Full receipt printing — thermal & PDF", "Barcode scanner & cash drawer support", "Multi-cashier, shift management"].map(f => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                <span style={{ color: C.gold, fontSize: 14 }}>✓</span>{f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

// ── Pricing ─────────────────────────────────────────────────────────────────────
const Pricing = () => {
  const [, setLocation] = useLocation();

  const plans: PlanType[] = [
    { name: "Test Mode",   badge: null,          price: "Free",   unit: "/yr", tagline: "For development & testing", features: ["Unlimited Invoices (Test)", "Sandboxed FDMS", "API Access", "Dev Support"],                                              cta: "Get Started",  highlight: false },
    { name: "Production",  badge: "Most Popular", price: "$150",   unit: "/yr", tagline: "Per device / year",         features: ["Unlimited Invoices", "Live FDMS Sync", "Priority Support", "ZIMRA Compliant", "Smart QR Codes", "Auto-Tax Engine"],     cta: "Get Started",  highlight: true  },
    { name: "Enterprise",  badge: null,           price: "Custom", unit: "",    tagline: "For large organizations",   features: ["Unlimited Users", "Dedicated Manager", "SLA Assurance", "Custom Integration", "Email Hosting", "On-premise option"],    cta: "Contact Sales",highlight: false },
  ];

  return (
    <section id="pricing" style={{ background: C.ash, padding: "100px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.18em", color: C.steel, display: "block", marginBottom: 12 }}>PRICING</span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: C.navy, letterSpacing: "-0.03em" }}>
            Transparent{" "}
            <em style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: "italic", color: C.gold }}>pricing.</em>
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: C.steel, marginTop: 12 }}>
            Start for free, scale as you grow.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {plans.map(p => (
            <div
              key={p.name}
              style={{ background: p.highlight ? C.navy : "#fff", border: `1px solid ${p.highlight ? "rgba(37,99,235,0.4)" : "rgba(13,27,42,0.08)"}`, borderRadius: 28, padding: "32px 28px", display: "flex", flexDirection: "column", position: "relative", transition: "transform 0.3s", boxShadow: p.highlight ? "0 20px 60px rgba(13,27,42,0.25)" : "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
            >
              {p.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: C.gold, color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 99, fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap" }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em", color: p.highlight ? C.gold : C.steel, marginBottom: 12 }}>{p.name.toUpperCase()}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 40, fontWeight: 800, color: p.highlight ? "#fff" : C.navy, letterSpacing: "-0.04em", lineHeight: 1 }}>{p.price}</span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: p.highlight ? "rgba(255,255,255,0.4)" : C.steel, marginBottom: 6 }}>{p.unit}</span>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: p.highlight ? "rgba(255,255,255,0.45)" : C.steel, marginBottom: 24, lineHeight: 1.5 }}>{p.tagline}</p>
              <ul style={{ listStyle: "none", padding: 0, flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: p.highlight ? "rgba(255,255,255,0.65)" : C.slate }}>
                    <span style={{ color: C.gold, flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => p.cta === "Contact Sales" ? window.open(WHATSAPP_URL, "_blank") : setLocation("/auth?mode=signup")}
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 14, background: p.highlight ? C.gold : "rgba(13,27,42,0.07)", color: p.highlight ? "#fff" : C.navy, border: "none", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── FAQ ─────────────────────────────────────────────────────────────────────────
const faqs: FaqType[] = [
  { q: "What is ZIMRA compliance and why do I need it?",         a: `ZIMRA (Zimbabwe Revenue Authority) requires all VAT-registered businesses to use a certified Fiscal Device Management System (FDMS) to generate tamper-proof tax receipts. Non-compliance carries heavy penalties. ${useBranding().brand.name} is a certified solution that handles all of this automatically.` },
  { q: "How does the FDMS integration work?",                    a: `${useBranding().brand.name} connects directly to Zimbabwe's FDMS infrastructure via secure API. Every invoice is cryptographically signed and submitted to FDMS in real time. A unique QR code is embedded on every receipt for instant verification by ZIMRA officials.` },
  { q: `Can I try ${useBranding().brand.name} before committing to a paid plan?`,a: "Yes — our Test Mode is completely free and gives you full access to a sandboxed FDMS environment, unlimited test invoices, and API access. No credit card required. When you're ready, upgrade to Production with one click." },
  { q: "What happens to my data if I cancel my subscription?",   a: "Your data remains yours. You have a 90-day window to export all invoices, reports, and records in standard formats (PDF, CSV, JSON). We never delete data unilaterally, and you can reinstate your account at any time." },
  { q: "Is my financial data secure?",                           a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are hosted on ISO 27001-certified infrastructure with daily encrypted backups. We never share or sell your financial data." },
  { q: `Can I use ${useBranding().brand.name} for multiple businesses?`,         a: "Absolutely. You can manage multiple business entities under a single account, each with their own FDMS devices, VAT numbers, invoice sequences, and reporting dashboards." },
  { q: "Do you provide customer support?",                       a: "All plans include email support. Production plans include priority support with a 4-hour response SLA. Enterprise plans receive a dedicated account manager and a guaranteed SLA for uptime and response times." },
  { q: "Can I customize my invoice templates?",                  a: `Yes. ${useBranding().brand.name}'s invoice builder supports full branding — logo, colors, fonts, custom line-item fields, and footer notes — while maintaining ZIMRA-required fiscal elements on every document.` },
];

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" style={{ background: C.charcoal, padding: "100px 24px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.18em", color: "rgba(37,99,235,0.6)", display: "block", marginBottom: 12 }}>FAQ</span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
            Frequently asked{" "}
            <em style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: "italic", color: C.gold }}>questions.</em>
          </h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: "rgba(255,255,255,0.35)", marginTop: 12 }}>
            Everything you need to know about {brand.name} and ZIMRA compliance.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.map((f, i) => (
            <div
              key={i}
              style={{ background: open === i ? "rgba(37,99,235,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${open === i ? "rgba(37,99,235,0.25)" : "rgba(255,255,255,0.05)"}`, borderRadius: 16, overflow: "hidden", transition: "all 0.3s" }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: "100%", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{f.q}</span>
                <span style={{ color: C.gold, fontSize: 18, marginLeft: 16, flexShrink: 0, transition: "transform 0.3s", transform: open === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: "0 22px 20px", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact strip */}
        <div style={{ marginTop: 48, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "28px 32px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
            Still have questions?
          </p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            Our support team is here to help. Get in touch and we'll respond as soon as possible.
          </p>
          <button
            onClick={() => window.open(WHATSAPP_URL, "_blank")}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, padding: "11px 24px", borderRadius: 99, background: C.gold, color: "#fff", border: "none", cursor: "pointer" }}
          >
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
};

// ── Footer ──────────────────────────────────────────────────────────────────────
const Footer = () => {
  const { brand } = useBranding();
  return (
    <footer style={{ background: C.charcoal, borderTop: "1px solid rgba(255,255,255,0.05)", padding: "56px 24px 32px", borderRadius: "3rem 3rem 0 0" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(3,1fr)", gap: 40, marginBottom: 48 }} className="grid-footer">
        <div>
          <img src={brand.logo} alt={brand.name} style={{ height: 36, width: "auto", display: "block", marginBottom: 12 }} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, maxWidth: 240 }}>
            Zimbabwe's intelligent fiscalization platform. Built for compliance, designed for growth.
          </p>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <a href={`mailto:${brand.supportEmail}`} style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(37,99,235,0.8)", textDecoration: "none", letterSpacing: "0.06em" }}>
              {brand.supportEmail}
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.5s infinite", display: "inline-block" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>System Operational</span>
          </div>
        </div>
        {[
          { title: "Platform", links: ["Invoicing", "FDMS Sync", "Smart POS", "Inventory", "Email Hosting", "Analytics"] },
          { title: "Company",  links: ["About", "Careers", "Blog", "Press", "Partners"] },
          { title: "Legal",    links: ["Privacy Policy", "Terms of Service", "Security", "ZIMRA Compliance"] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.16em", color: "rgba(255,255,255,0.2)", marginBottom: 16 }}>{col.title.toUpperCase()}</div>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {col.links.map(l => (
                <li key={l}>
                  <a
                    href="#"
                    style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.38)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.38)"; }}
                  >{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
          &copy; 2026 {brand.name}. Made with &hearts; in Zimbabwe.
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          {["Privacy", "Terms", "Security"].map(l => (
            <a key={l} href="#" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </div>
    </div>
    </footer>
  );
};

// ── WhatsApp Chat Widget ────────────────────────────────────────────────────────
const ChatWidget = () => {
  const { brand } = useBranding();
  const [open, setOpen] = useState(false);
  const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(brand.whatsappMessage)}`;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
      {open && (
        <div style={{ width: 300, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden", marginBottom: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ background: "#25D366", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* WhatsApp icon */}
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#25D366"/>
                <path d="M22.5 9.5A8.96 8.96 0 0 0 16 7C11.03 7 7 11.03 7 16c0 1.59.42 3.13 1.2 4.49L7 25l4.63-1.21A8.95 8.95 0 0 0 16 25c4.97 0 9-4.03 9-9 0-2.4-.94-4.66-2.5-6.5zm-6.5 13.84a7.44 7.44 0 0 1-3.79-1.03l-.27-.16-2.75.72.73-2.69-.18-.28A7.44 7.44 0 0 1 8.56 16c0-4.1 3.34-7.44 7.44-7.44 1.99 0 3.86.77 5.26 2.18a7.4 7.4 0 0 1 2.18 5.26c0 4.1-3.34 7.44-7.44 7.44zm4.08-5.57c-.22-.11-1.3-.64-1.5-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.48.06-.22-.11-.94-.35-1.79-1.1-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.43c-.15 0-.39.06-.6.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.58 2.41 3.83 3.38.54.23.96.37 1.28.47.54.17 1.03.15 1.42.09.43-.07 1.3-.53 1.49-1.04.18-.51.18-.95.13-1.04-.06-.09-.2-.15-.42-.26z" fill="white"/>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{brand.name} Support</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>Typically replies instantly</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>

          {/* Chat preview bubble */}
          <div style={{ padding: "16px 14px", background: "#ECE5DD", minHeight: 100, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "#fff", borderRadius: "0 12px 12px 12px", padding: "10px 14px", maxWidth: "85%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
              <p style={{ fontSize: 13, color: "#111", margin: 0, lineHeight: 1.5 }}>Hi! 👋 How can we help you today?</p>
              <p style={{ fontSize: 10, color: "#999", margin: "4px 0 0", textAlign: "right" }}>09:41 ✓✓</p>
            </div>
          </div>

          {/* CTA to open WhatsApp */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "#25D366", color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none", transition: "background 0.2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#1ebe5d"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#25D366"; }}
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.5 9.5A8.96 8.96 0 0 0 16 7C11.03 7 7 11.03 7 16c0 1.59.42 3.13 1.2 4.49L7 25l4.63-1.21A8.95 8.95 0 0 0 16 25c4.97 0 9-4.03 9-9 0-2.4-.94-4.66-2.5-6.5zm-6.5 13.84a7.44 7.44 0 0 1-3.79-1.03l-.27-.16-2.75.72.73-2.69-.18-.28A7.44 7.44 0 0 1 8.56 16c0-4.1 3.34-7.44 7.44-7.44 1.99 0 3.86.77 5.26 2.18a7.4 7.4 0 0 1 2.18 5.26c0 4.1-3.34 7.44-7.44 7.44z"/>
            </svg>
            Chat with us on WhatsApp
          </a>
        </div>
      )}

      {/* Float button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: 56, height: 56, borderRadius: "50%", background: "#25D366", border: "none", cursor: "pointer", boxShadow: "0 6px 24px rgba(37,211,102,0.45)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        aria-label="Chat on WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.5 9.5A8.96 8.96 0 0 0 16 7C11.03 7 7 11.03 7 16c0 1.59.42 3.13 1.2 4.49L7 25l4.63-1.21A8.95 8.95 0 0 0 16 25c4.97 0 9-4.03 9-9 0-2.4-.94-4.66-2.5-6.5zm-6.5 13.84a7.44 7.44 0 0 1-3.79-1.03l-.27-.16-2.75.72.73-2.69-.18-.28A7.44 7.44 0 0 1 8.56 16c0-4.1 3.34-7.44 7.44-7.44 1.99 0 3.86.77 5.26 2.18a7.4 7.4 0 0 1 2.18 5.26c0 4.1-3.34 7.44-7.44 7.44zm4.08-5.57c-.22-.11-1.3-.64-1.5-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.48.06-.22-.11-.94-.35-1.79-1.1-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.43c-.15 0-.39.06-.6.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.58 2.41 3.83 3.38.54.23.96.37 1.28.47.54.17 1.03.15 1.42.09.43-.07 1.3-.53 1.49-1.04.18-.51.18-.95.13-1.04-.06-.09-.2-.15-.42-.26z" fill="white"/>
        </svg>
      </button>
    </div>
  );
};

// ── App / Default Export ────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: C.ash, overflowX: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:768px){
          .grid-footer { grid-template-columns: 1fr 1fr !important; }
        }
        @media(max-width:480px){
          .grid-footer { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <FontLoader />
      <Noise />
      <Navbar />
      <Hero />
      <Features />
      <POSHighlight />
      <Pricing />
      <FAQ />
      <Footer />
      <ChatWidget />
    </div>
  );
}