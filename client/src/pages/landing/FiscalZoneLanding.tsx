// FiscalZone Logo — faithful SVG recreation of the bar-chart + orbit-ring + arrow mark
function FZLogo({ size = 36, mono = false }: { size?: number; mono?: boolean }) {
  const g1s = mono ? "#ffffff" : "#1260EA";
  const g1e = mono ? "#cccccc" : "#00D4FF";
  const g2s = mono ? "#dddddd" : "#0A3FC0";
  const g2e = mono ? "#ffffff" : "#5B9BFF";
  const id = mono ? "fzm" : "fzc";
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}1`} x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={g1s} />
          <stop offset="100%" stopColor={g1e} />
        </linearGradient>
        <linearGradient id={`${id}2`} x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={g2s} />
          <stop offset="100%" stopColor={g2e} />
        </linearGradient>
      </defs>

      {/* Outer orbit ring — large ellipse tilted, sweeping around the chart */}
      <ellipse cx="52" cy="62" rx="44" ry="17" stroke={`url(#${id}1)`} strokeWidth="4.5" fill="none"
        strokeLinecap="round" strokeDasharray="180 40" strokeDashoffset="30"
        transform="rotate(-8 52 62)" />
      {/* Inner orbit tail on bottom */}
      <path d="M18 68 Q30 82 52 78 Q74 74 86 62" stroke={`url(#${id}2)`} strokeWidth="3" fill="none"
        strokeLinecap="round" opacity="0.55" />

      {/* Bar chart — 3 ascending columns */}
      <rect x="26" y="50" width="11" height="22" rx="2.5" fill={`url(#${id}2)`} />
      <rect x="40" y="38" width="11" height="34" rx="2.5" fill={`url(#${id}1)`} />
      <rect x="54" y="26" width="11" height="46" rx="2.5" fill={`url(#${id}1)`} />

      {/* Growth arrow — diagonal line + arrowhead pointing upper-right */}
      <line x1="52" y1="65" x2="74" y2="18" stroke={`url(#${id}1)`} strokeWidth="5" strokeLinecap="round" />
      <polygon points="74,8 82,22 66,22" fill={`url(#${id}1)`} />
    </svg>
  );
}

export default function FiscalZoneLanding() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');

        :root {
          --blue: #1565FF; --blue-bright: #2979FF; --blue-light: #5B9BFF;
          --cyan: #00D4FF; --cyan-dim: rgba(0,212,255,0.1);
          --blue-pale: rgba(21,101,255,0.12); --blue-dim: rgba(21,101,255,0.08);
          --green: #00CC66;
          --bg: #04080f; --surface: rgba(255,255,255,0.03);
          --border: rgba(21,101,255,0.18); --border-b: rgba(91,155,255,0.13);
          --text: #e8f0ff; --muted: rgba(232,240,255,0.48);
        }
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }

        /* BG */
        .bg { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; background:#04080f; }
        .bg-orb { position:absolute; border-radius:50%; filter:blur(90px); will-change:transform; }
        .bg-o1 { width:800px; height:800px; background:radial-gradient(circle, rgba(21,101,255,0.17) 0%, transparent 70%); top:-220px; right:-200px; animation:d1 24s ease-in-out infinite; }
        .bg-o2 { width:600px; height:600px; background:radial-gradient(circle, rgba(0,212,255,0.09) 0%, transparent 70%); bottom:-160px; left:-140px; animation:d2 30s ease-in-out infinite; }
        .bg-o3 { width:400px; height:400px; background:radial-gradient(circle, rgba(21,101,255,0.07) 0%, transparent 70%); top:48%; left:36%; filter:blur(70px); animation:d3 19s ease-in-out infinite; }
        @keyframes d1 { 0%,100%{transform:translate(0,0)} 40%{transform:translate(-60px,50px)} 70%{transform:translate(40px,-30px)} }
        @keyframes d2 { 0%,100%{transform:translate(0,0)} 35%{transform:translate(55px,-60px)} 65%{transform:translate(-30px,40px)} }
        @keyframes d3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-80px,65px) scale(1.2)} }
        .bg-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(21,101,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(21,101,255,0.045) 1px, transparent 1px); background-size:60px 60px; mask-image:radial-gradient(ellipse 80% 70% at 65% 30%, black 0%, transparent 70%); }
        .bg-shape { position:absolute; border:1px solid rgba(21,101,255,0.13); border-radius:3px; animation:shf ease-in-out infinite; }
        .bg-shape:nth-child(1){ width:70px; height:70px; right:12%; top:8%; transform:rotate(18deg); animation-duration:22s; }
        .bg-shape:nth-child(2){ width:42px; height:42px; right:4%; top:54%; border-radius:50%; border-color:rgba(0,212,255,0.13); animation-duration:28s; animation-delay:-9s; }
        .bg-shape:nth-child(3){ width:105px; height:105px; right:28%; top:16%; border-radius:50%; border-color:rgba(21,101,255,0.05); animation-duration:34s; animation-delay:-16s; }
        .bg-shape:nth-child(4){ width:30px; height:30px; right:19%; top:74%; transform:rotate(45deg); animation-duration:18s; animation-delay:-5s; }
        .bg-shape:nth-child(5){ width:56px; height:56px; right:50%; top:64%; border-radius:50%; border-color:rgba(0,212,255,0.07); animation-duration:25s; animation-delay:-13s; }
        @keyframes shf { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-24px)} }

        /* NAV */
        .nav { position:fixed; top:0; left:0; right:0; z-index:200; display:flex; align-items:center; justify-content:space-between; padding:0 52px; height:70px; background:rgba(4,8,15,0.82); backdrop-filter:blur(22px); border-bottom:1px solid var(--border); }
        .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .nav-logo-txt { font-family:'Bricolage Grotesque',sans-serif; font-size:20px; font-weight:800; letter-spacing:-0.03em; color:var(--text); }
        .nav-logo-txt span { background:linear-gradient(135deg,#5B9BFF,#00D4FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .nav-links { display:flex; gap:30px; list-style:none; }
        .nav-links a { color:var(--muted); text-decoration:none; font-size:14px; font-weight:500; letter-spacing:0.04em; transition:color 0.2s; }
        .nav-links a:hover { color:var(--text); }
        .nav-cta { display:flex; gap:10px; align-items:center; }
        .btn-ghost { padding:8px 18px; border-radius:6px; font-size:13px; font-weight:600; border:1px solid var(--border); color:var(--text); background:transparent; cursor:pointer; font-family:'Syne',sans-serif; letter-spacing:0.04em; transition:all 0.2s; text-decoration:none; display:inline-flex; align-items:center; }
        .btn-ghost:hover { border-color:var(--blue-bright); color:var(--blue-light); }
        .btn-cta { padding:8px 20px; border-radius:6px; font-size:13px; font-weight:700; border:none; background:linear-gradient(135deg,var(--blue),var(--blue-bright)); color:#fff; cursor:pointer; font-family:'Syne',sans-serif; letter-spacing:0.03em; transition:all 0.2s; text-decoration:none; display:inline-flex; align-items:center; box-shadow:0 4px 20px rgba(21,101,255,0.35); }
        .btn-cta:hover { box-shadow:0 6px 28px rgba(21,101,255,0.5); transform:translateY(-1px); }

        /* HERO */
        .hero { min-height:100vh; display:grid; grid-template-columns:1fr 1fr; align-items:center; padding:100px 6vw 60px; position:relative; z-index:1; gap:40px; }
        @media(max-width:900px){ .hero{grid-template-columns:1fr;} .hero-graphic{display:none;} }
        .eyebrow { display:flex; align-items:center; gap:10px; margin-bottom:24px; font-family:'DM Mono',monospace; font-size:11px; font-weight:500; color:var(--blue-light); letter-spacing:0.2em; text-transform:uppercase; }
        .eyebrow::before { content:''; width:26px; height:1px; background:linear-gradient(90deg,var(--blue),var(--cyan)); flex-shrink:0; }
        .hero-title { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(42px,5.5vw,76px); font-weight:800; line-height:0.93; letter-spacing:-0.04em; color:var(--text); margin-bottom:26px; }
        .hero-title .grad { background:linear-gradient(135deg,#5B9BFF 0%,#00D4FF 60%,#5B9BFF 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-size:200%; animation:shimmer 4s ease-in-out infinite alternate; }
        @keyframes shimmer { 0%{background-position:0%} 100%{background-position:100%} }
        .hero-sub { font-size:clamp(13px,1.4vw,16px); color:var(--muted); max-width:470px; line-height:1.72; margin-bottom:38px; }
        .hero-actions { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .btn-hero { padding:14px 30px; border-radius:8px; font-size:15px; font-weight:700; border:none; background:linear-gradient(135deg,#1565FF,#2979FF); color:#fff; cursor:pointer; font-family:'Bricolage Grotesque',sans-serif; letter-spacing:-0.01em; transition:all 0.25s; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow:0 8px 30px rgba(21,101,255,0.4); }
        .btn-hero:hover { box-shadow:0 12px 44px rgba(21,101,255,0.55); transform:translateY(-2px); }
        .btn-hero-ghost { padding:13px 30px; border-radius:8px; font-size:15px; font-weight:600; border:1px solid rgba(21,101,255,0.32); color:var(--text); background:transparent; cursor:pointer; font-family:'Bricolage Grotesque',sans-serif; transition:all 0.25s; text-decoration:none; display:inline-flex; align-items:center; gap:8px; }
        .btn-hero-ghost:hover { border-color:var(--blue-bright); color:var(--blue-light); }
        .hero-badges { display:flex; gap:8px; margin-top:36px; flex-wrap:wrap; }
        .badge { padding:5px 11px; border-radius:4px; font-size:10px; font-weight:600; font-family:'DM Mono',monospace; letter-spacing:0.08em; }
        .badge-b { background:rgba(21,101,255,0.1); border:1px solid rgba(21,101,255,0.25); color:var(--blue-light); }
        .badge-c { background:rgba(0,212,255,0.08); border:1px solid rgba(0,212,255,0.2); color:var(--cyan); }

        /* HERO GRAPHIC */
        .hero-graphic { position:relative; display:flex; align-items:center; justify-content:center; height:540px; }
        .hg-glow { position:absolute; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle, rgba(21,101,255,0.2) 0%, rgba(0,212,255,0.07) 50%, transparent 70%); filter:blur(28px); animation:hgGlow 4s ease-in-out infinite; }
        @keyframes hgGlow { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.1);opacity:1} }
        .hg-ring { position:absolute; top:50%; left:50%; width:340px; height:340px; border-radius:50%; border:1px solid rgba(21,101,255,0.16); transform:translate(-50%,-50%); animation:rRot 18s linear infinite; }
        .hg-ring2 { position:absolute; top:50%; left:50%; width:430px; height:280px; border-radius:50%; border:1px dashed rgba(0,212,255,0.09); transform:translate(-50%,-50%) rotate(-20deg); animation:rRot 28s linear infinite reverse; }
        @keyframes rRot { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }

        /* Invoice card */
        .hg-card { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:268px; background:rgba(6,14,32,0.94); border:1px solid rgba(21,101,255,0.32); border-radius:14px; padding:20px 18px; box-shadow:0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(21,101,255,0.08); backdrop-filter:blur(12px); animation:cardF 5s ease-in-out infinite; }
        @keyframes cardF { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-10px)} }
        .hg-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
        .hg-co { font-family:'Bricolage Grotesque',sans-serif; font-size:12px; font-weight:700; color:var(--text); }
        .hg-vat { font-family:'DM Mono',monospace; font-size:9px; color:var(--muted); margin-top:2px; }
        .hg-fiscal { padding:3px 7px; border-radius:3px; background:rgba(0,204,102,0.12); border:1px solid rgba(0,204,102,0.28); font-family:'DM Mono',monospace; font-size:8px; color:#00CC66; letter-spacing:0.1em; font-weight:600; }
        .hg-invnum { font-family:'DM Mono',monospace; font-size:9px; color:var(--blue-light); margin-bottom:10px; }
        .hg-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(21,101,255,0.07); }
        .hg-lbl { font-size:10px; color:var(--muted); }
        .hg-val { font-size:10px; color:var(--text); font-family:'DM Mono',monospace; }
        .hg-div { border:none; border-top:1px solid rgba(21,101,255,0.18); margin:8px 0; }
        .hg-total { display:flex; justify-content:space-between; }
        .hg-tlbl { font-family:'Bricolage Grotesque',sans-serif; font-size:12px; font-weight:800; color:var(--text); }
        .hg-tval { font-size:12px; font-weight:800; font-family:'DM Mono',monospace; background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .hg-qr { display:flex; align-items:center; gap:9px; margin-top:12px; padding-top:10px; border-top:1px solid rgba(21,101,255,0.09); }
        .hg-qr-box { width:34px; height:34px; background:rgba(21,101,255,0.08); border:1px solid rgba(21,101,255,0.2); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .hg-qr-txt { font-family:'DM Mono',monospace; font-size:8px; color:var(--muted); line-height:1.55; }
        .hg-qr-txt span { color:var(--blue-light); }

        /* Doc type tabs on card */
        .hg-tabs { display:flex; gap:4px; margin-bottom:12px; }
        .hg-tab { padding:3px 8px; border-radius:3px; font-family:'DM Mono',monospace; font-size:8px; font-weight:600; letter-spacing:0.08em; cursor:default; }
        .hg-tab.active { background:rgba(21,101,255,0.2); border:1px solid rgba(21,101,255,0.4); color:var(--blue-light); }
        .hg-tab.inactive { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); color:var(--muted); }

        .hg-fdms { position:absolute; top:6%; right:2%; display:flex; align-items:center; gap:6px; background:rgba(0,204,102,0.1); border:1px solid rgba(0,204,102,0.24); border-radius:20px; padding:5px 11px; font-family:'DM Mono',monospace; font-size:10px; color:#00CC66; letter-spacing:0.08em; }
        .hg-fdms-dot { width:6px; height:6px; border-radius:50%; background:#00CC66; animation:fdP 1.5s ease-in-out infinite; }
        @keyframes fdP { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }

        .hg-pill { position:absolute; background:rgba(6,14,32,0.92); border:1px solid rgba(21,101,255,0.28); border-radius:8px; padding:8px 12px; backdrop-filter:blur(8px); white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
        .hg-pill-ico { font-size:13px; margin-bottom:2px; }
        .hg-pill-val { font-family:'Bricolage Grotesque',sans-serif; font-size:13px; font-weight:800; color:var(--text); line-height:1; }
        .hg-pill-lbl { font-family:'DM Mono',monospace; font-size:8px; color:var(--muted); letter-spacing:0.08em; margin-top:1px; }
        .hg-p1 { top:9%; left:50%; transform:translateX(-50%); animation:fp1 5s ease-in-out infinite; }
        .hg-p2 { top:26%; right:3%; animation:fp2 6s ease-in-out infinite; }
        .hg-p3 { bottom:14%; right:5%; animation:fp3 4.5s ease-in-out infinite; }
        .hg-p4 { bottom:8%; left:50%; transform:translateX(-50%); animation:fp4 5.5s ease-in-out infinite; }
        .hg-p5 { top:26%; left:3%; animation:fp5 6.5s ease-in-out infinite; }
        @keyframes fp1 { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-8px)} }
        @keyframes fp2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fp3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes fp4 { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-9px)} }
        @keyframes fp5 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-11px)} }

        .hg-bars { position:absolute; bottom:5%; left:2%; display:flex; align-items:flex-end; gap:5px; height:56px; opacity:0.45; }
        .hg-bar { width:10px; border-radius:3px 3px 0 0; background:linear-gradient(to top, rgba(21,101,255,.65), rgba(0,212,255,.45)); animation:bP ease-in-out infinite; }
        .hg-bar:nth-child(1){ height:30%; animation-duration:2.1s; }
        .hg-bar:nth-child(2){ height:55%; animation-duration:2.4s; animation-delay:.2s; }
        .hg-bar:nth-child(3){ height:40%; animation-duration:1.9s; animation-delay:.4s; }
        .hg-bar:nth-child(4){ height:75%; animation-duration:2.6s; animation-delay:.1s; }
        .hg-bar:nth-child(5){ height:60%; animation-duration:2.2s; animation-delay:.3s; }
        .hg-bar:nth-child(6){ height:88%; animation-duration:2.8s; animation-delay:.5s; }
        .hg-bar:nth-child(7){ height:68%; animation-duration:2.0s; animation-delay:.2s; }
        @keyframes bP { 0%,100%{opacity:.45} 50%{opacity:.9} }

        /* STATS */
        .stats { padding:52px 8vw; background:rgba(21,101,255,0.035); border-top:1px solid var(--border); border-bottom:1px solid var(--border); display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:32px; position:relative; z-index:1; }
        .stat-val { font-family:'Bricolage Grotesque',sans-serif; font-size:44px; font-weight:800; line-height:1; letter-spacing:-0.04em; background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:5px; }
        .stat-lbl { font-size:12px; color:var(--muted); font-weight:500; letter-spacing:0.04em; }

        /* INVOICE FEATURE HIGHLIGHT */
        .inv-section { padding:92px 8vw; background:rgba(21,101,255,0.025); border-top:1px solid var(--border); border-bottom:1px solid var(--border); position:relative; z-index:1; }
        .inv-grid { display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center; margin-top:52px; }
        @media(max-width:900px){ .inv-grid{grid-template-columns:1fr; gap:36px;} }
        .inv-preview-wrap { display:flex; flex-direction:column; gap:12px; }
        .inv-preview-tabs { display:flex; gap:6px; }
        .inv-tab { padding:6px 16px; border-radius:5px; font-family:'DM Mono',monospace; font-size:11px; font-weight:600; letter-spacing:0.08em; cursor:default; }
        .inv-tab.on { background:rgba(21,101,255,0.18); border:1px solid rgba(21,101,255,0.38); color:var(--blue-light); }
        .inv-tab.off { background:var(--surface); border:1px solid var(--border-b); color:var(--muted); }

        /* A4 invoice mock */
        .inv-a4 { background:rgba(6,14,32,0.92); border:1px solid rgba(21,101,255,0.28); border-radius:10px; padding:22px 20px; font-family:'DM Mono',monospace; position:relative; overflow:hidden; }
        .inv-a4::before { content:'A4 · PDF · ZIMRA'; position:absolute; top:10px; right:12px; font-size:9px; color:var(--blue-light); letter-spacing:0.1em; opacity:0.6; }
        .inv-a4-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .inv-a4-brand { display:flex; align-items:center; gap:8px; }
        .inv-a4-logo { width:28px; height:28px; }
        .inv-a4-bname { font-family:'Bricolage Grotesque',sans-serif; font-size:14px; font-weight:800; color:var(--text); }
        .inv-a4-bname span { background:linear-gradient(135deg,#5B9BFF,#00D4FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .inv-a4-tag { text-align:right; }
        .inv-a4-invlbl { font-size:9px; color:var(--muted); letter-spacing:0.12em; text-transform:uppercase; }
        .inv-a4-invnum { font-size:12px; font-weight:600; color:var(--blue-light); margin-top:2px; }
        .inv-a4-parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:14px; }
        .inv-a4-party-lbl { font-size:8px; color:var(--muted); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:4px; }
        .inv-a4-party-name { font-size:11px; font-weight:600; color:var(--text); }
        .inv-a4-party-detail { font-size:9px; color:var(--muted); margin-top:2px; line-height:1.5; }
        .inv-a4-table-head { display:grid; grid-template-columns:1fr auto auto; gap:8px; padding:5px 0; border-bottom:1px solid rgba(21,101,255,0.2); margin-bottom:4px; }
        .inv-a4-th { font-size:8px; color:var(--muted); letter-spacing:0.1em; text-transform:uppercase; }
        .inv-a4-tr { display:grid; grid-template-columns:1fr auto auto; gap:8px; padding:5px 0; border-bottom:1px solid rgba(21,101,255,0.06); }
        .inv-a4-td { font-size:10px; color:var(--text); }
        .inv-a4-td.right { text-align:right; }
        .inv-a4-td.muted { color:var(--muted); text-align:right; }
        .inv-a4-totals { margin-top:10px; display:flex; flex-direction:column; gap:4px; align-items:flex-end; }
        .inv-a4-tot-row { display:flex; gap:24px; justify-content:flex-end; }
        .inv-a4-tot-lbl { font-size:9px; color:var(--muted); letter-spacing:0.08em; }
        .inv-a4-tot-val { font-size:9px; color:var(--text); min-width:64px; text-align:right; }
        .inv-a4-tot-row.grand .inv-a4-tot-lbl { font-family:'Bricolage Grotesque',sans-serif; font-size:11px; font-weight:800; color:var(--text); }
        .inv-a4-tot-row.grand .inv-a4-tot-val { background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-family:'Bricolage Grotesque',sans-serif; font-size:13px; font-weight:800; }
        .inv-a4-footer { display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid rgba(21,101,255,0.12); }
        .inv-a4-zimra { display:flex; align-items:center; gap:6px; }
        .inv-a4-qr { width:28px; height:28px; background:rgba(21,101,255,0.1); border:1px solid rgba(21,101,255,0.2); border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:14px; }
        .inv-a4-verify { font-size:8px; color:var(--muted); line-height:1.5; }
        .inv-a4-verify span { color:var(--blue-light); }
        .inv-a4-stamp { padding:4px 10px; border-radius:3px; background:rgba(0,204,102,0.1); border:1px solid rgba(0,204,102,0.26); font-size:9px; color:#00CC66; letter-spacing:0.1em; font-weight:600; }

        /* Receipt mock */
        .inv-receipt { background:rgba(6,14,32,0.92); border:1px solid rgba(21,101,255,0.28); border-radius:10px; padding:18px 16px; font-family:'DM Mono',monospace; max-width:220px; margin:0 auto; position:relative; }
        .inv-receipt::before { content:'THERMAL RECEIPT'; position:absolute; top:10px; right:10px; font-size:8px; color:var(--blue-light); letter-spacing:0.1em; opacity:0.55; }
        .inv-rco { font-family:'Bricolage Grotesque',sans-serif; font-size:13px; font-weight:800; color:var(--text); text-align:center; margin-bottom:2px; }
        .inv-raddr { font-size:8px; color:var(--muted); text-align:center; margin-bottom:10px; line-height:1.5; }
        .inv-rdivider { border:none; border-top:1px dashed rgba(21,101,255,0.2); margin:8px 0; }
        .inv-rrow { display:flex; justify-content:space-between; padding:3px 0; }
        .inv-rrow-lbl { font-size:10px; color:var(--muted); }
        .inv-rrow-val { font-size:10px; color:var(--text); }
        .inv-rtotal { display:flex; justify-content:space-between; padding:6px 0; border-top:2px solid rgba(21,101,255,0.2); margin-top:4px; }
        .inv-rtotal-lbl { font-family:'Bricolage Grotesque',sans-serif; font-size:12px; font-weight:800; color:var(--text); }
        .inv-rtotal-val { font-family:'Bricolage Grotesque',sans-serif; font-size:12px; font-weight:800; background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .inv-rqr { text-align:center; margin-top:10px; font-size:22px; }
        .inv-rfiscal { text-align:center; font-size:8px; color:#00CC66; letter-spacing:0.1em; margin-top:4px; }

        .inv-points { display:flex; flex-direction:column; gap:18px; }
        .inv-point { display:flex; gap:14px; align-items:flex-start; }
        .inv-point-ico { width:38px; height:38px; flex-shrink:0; border-radius:9px; background:var(--blue-dim); border:1px solid rgba(21,101,255,0.22); display:flex; align-items:center; justify-content:center; font-size:18px; }
        .inv-point-txt { }
        .inv-point-t { font-family:'Bricolage Grotesque',sans-serif; font-size:15px; font-weight:700; color:var(--text); margin-bottom:4px; }
        .inv-point-d { font-size:13px; color:var(--muted); line-height:1.65; }

        /* SECTIONS */
        .section { padding:92px 8vw; position:relative; z-index:1; }
        .sec-eye { font-family:'DM Mono',monospace; font-size:11px; color:var(--blue-light); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:10px; }
        .sec-eye::before { content:''; width:22px; height:1px; background:linear-gradient(90deg,var(--blue),var(--cyan)); }
        .sec-title { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(32px,4vw,52px); font-weight:800; letter-spacing:-0.035em; line-height:1.04; color:var(--text); margin-bottom:16px; }
        .sec-sub { font-size:16px; color:var(--muted); line-height:1.68; max-width:540px; }

        /* FEATURES */
        .feat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(268px,1fr)); gap:2px; margin-top:52px; }
        .feat-card { padding:34px 30px; background:var(--surface); border:1px solid var(--border-b); position:relative; overflow:hidden; transition:background 0.3s; }
        .feat-card:hover { background:rgba(21,101,255,0.055); }
        .feat-card::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--blue),var(--cyan),transparent); transform:scaleX(0); transform-origin:left; transition:transform 0.38s; }
        .feat-card:hover::after { transform:scaleX(1); }
        .feat-icon { width:42px; height:42px; border-radius:9px; background:var(--blue-dim); border:1px solid rgba(21,101,255,0.22); display:flex; align-items:center; justify-content:center; font-size:19px; margin-bottom:18px; }
        .feat-tag { font-family:'DM Mono',monospace; font-size:10px; color:var(--blue-light); letter-spacing:0.14em; text-transform:uppercase; margin-bottom:7px; opacity:0.7; }
        .feat-title { font-family:'Bricolage Grotesque',sans-serif; font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px; letter-spacing:-0.02em; }
        .feat-desc { font-size:13px; color:var(--muted); line-height:1.72; }

        /* POS */
        .pos-section { padding:92px 8vw; background:rgba(21,101,255,0.02); border-top:1px solid var(--border); border-bottom:1px solid var(--border); position:relative; z-index:1; }
        .pos-grid { display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; margin-top:52px; }
        @media(max-width:900px){ .pos-grid{grid-template-columns:1fr; gap:32px;} }
        .pos-mock { background:rgba(6,14,32,0.92); border:1px solid rgba(21,101,255,0.26); border-radius:12px; padding:24px; font-family:'DM Mono',monospace; }
        .pos-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
        .pos-title-mock { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:13px; color:var(--text); }
        .pos-status { padding:3px 9px; border-radius:4px; background:rgba(21,101,255,0.1); border:1px solid rgba(21,101,255,0.24); font-size:9px; color:var(--blue-light); letter-spacing:0.1em; }
        .pos-item { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(21,101,255,0.07); color:var(--muted); font-size:12px; }
        .pos-total { display:flex; justify-content:space-between; padding:12px 0 0; border-top:2px solid rgba(21,101,255,0.2); margin-top:4px; }
        .pos-total-lbl { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:12px; color:var(--text); }
        .pos-total-val { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:12px; background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .pos-btn { width:100%; margin-top:12px; padding:11px; border-radius:6px; background:linear-gradient(135deg,var(--blue),var(--blue-bright)); color:#fff; font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:12px; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(21,101,255,0.35); }
        .pos-sync-note { margin-top:8px; font-size:9px; color:var(--blue-light); text-align:center; opacity:0.8; }
        .pos-checks { display:flex; flex-direction:column; gap:16px; }
        .pos-check { display:flex; gap:12px; align-items:flex-start; }
        .check-ico { width:22px; height:22px; flex-shrink:0; border-radius:5px; background:rgba(0,204,102,0.1); border:1px solid rgba(0,204,102,0.2); display:flex; align-items:center; justify-content:center; color:#00CC66; font-size:11px; margin-top:1px; }
        .check-txt { font-size:13px; color:var(--muted); line-height:1.6; }
        .check-txt strong { color:var(--text); font-weight:600; }

        /* HOW */
        .how-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:0; margin-top:52px; position:relative; }
        .how-grid::before { content:''; position:absolute; top:35px; left:8%; right:8%; height:1px; background:linear-gradient(90deg, transparent, var(--blue), var(--cyan), var(--blue), transparent); }
        .how-step { padding:0 24px; text-align:center; }
        .step-n { width:70px; height:70px; border-radius:50%; margin:0 auto 22px; background:linear-gradient(135deg, rgba(21,101,255,0.14), rgba(0,212,255,0.09)); border:2px solid rgba(21,101,255,0.28); display:flex; align-items:center; justify-content:center; font-family:'Bricolage Grotesque',sans-serif; font-size:22px; font-weight:800; color:var(--blue-light); }
        .step-t { font-family:'Bricolage Grotesque',sans-serif; font-size:15px; font-weight:700; color:var(--text); margin-bottom:8px; }
        .step-d { font-size:12px; color:var(--muted); line-height:1.65; }

        /* PRICING */
        .price-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(258px,1fr)); gap:2px; margin-top:52px; }
        .price-card { padding:40px 34px; background:var(--surface); border:1px solid var(--border-b); position:relative; overflow:hidden; }
        .price-card.hot { background:rgba(21,101,255,0.07); border-color:rgba(21,101,255,0.33); }
        .price-card.hot::after { content:'MOST POPULAR'; position:absolute; top:16px; right:-30px; background:linear-gradient(135deg,var(--blue),var(--blue-bright)); color:#fff; font-size:9px; font-weight:800; letter-spacing:0.12em; padding:4px 40px; transform:rotate(45deg); font-family:'DM Mono',monospace; }
        .plan-tag { font-family:'DM Mono',monospace; font-size:10px; color:var(--blue-light); letter-spacing:0.14em; text-transform:uppercase; margin-bottom:12px; }
        .plan-price { font-family:'Bricolage Grotesque',sans-serif; font-size:46px; font-weight:800; letter-spacing:-0.04em; color:var(--text); line-height:1; margin-bottom:4px; }
        .plan-price sup { font-size:20px; vertical-align:super; color:var(--blue-light); }
        .plan-per { font-size:12px; color:var(--muted); margin-bottom:24px; }
        .plan-feats { list-style:none; display:flex; flex-direction:column; gap:10px; margin-bottom:30px; }
        .plan-feats li { font-size:12px; color:var(--muted); display:flex; gap:8px; align-items:flex-start; }
        .plan-feats li::before { content:'→'; color:var(--blue-light); font-size:12px; flex-shrink:0; margin-top:1px; }
        .btn-plan { width:100%; padding:12px; border-radius:6px; font-size:13px; font-weight:700; font-family:'Bricolage Grotesque',sans-serif; cursor:pointer; border:1px solid rgba(21,101,255,0.26); background:transparent; color:var(--text); transition:all 0.22s; letter-spacing:-0.01em; }
        .btn-plan.hot-btn { background:linear-gradient(135deg,var(--blue),var(--blue-bright)); color:#fff; border-color:transparent; box-shadow:0 4px 18px rgba(21,101,255,0.35); }
        .btn-plan:hover { border-color:var(--blue-bright); color:var(--blue-light); }
        .btn-plan.hot-btn:hover { box-shadow:0 6px 26px rgba(21,101,255,0.5); transform:translateY(-1px); }

        /* TESTI */
        .testi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(278px,1fr)); gap:2px; margin-top:52px; }
        .testi-card { padding:34px 30px; background:var(--surface); border:1px solid var(--border-b); }
        .testi-stars { font-size:13px; letter-spacing:3px; margin-bottom:12px; background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .testi-q { font-size:13px; color:var(--text); line-height:1.78; margin-bottom:22px; font-style:italic; opacity:0.8; }
        .testi-who { display:flex; align-items:center; gap:11px; }
        .testi-av { width:36px; height:36px; border-radius:50%; flex-shrink:0; background:var(--blue-dim); border:2px solid rgba(21,101,255,0.25); display:flex; align-items:center; justify-content:center; font-family:'Bricolage Grotesque',sans-serif; font-weight:800; color:var(--blue-light); font-size:13px; }
        .testi-name { font-size:12px; font-weight:700; color:var(--text); }
        .testi-role { font-size:10px; color:var(--muted); font-family:'DM Mono',monospace; letter-spacing:0.04em; }

        /* CTA */
        .cta-band { padding:104px 8vw; text-align:center; position:relative; z-index:1; background:linear-gradient(180deg, transparent 0%, rgba(21,101,255,0.05) 50%, transparent 100%); border-top:1px solid var(--border); }
        .cta-title { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(38px,5vw,68px); font-weight:800; letter-spacing:-0.04em; color:var(--text); line-height:0.97; margin-bottom:18px; }
        .cta-title .grad { background:linear-gradient(135deg,#5B9BFF,#00D4FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .cta-sub { font-size:15px; color:var(--muted); max-width:480px; margin:0 auto 38px; line-height:1.65; }
        .cta-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .wa-pill { display:inline-flex; align-items:center; gap:8px; padding:13px 22px; border-radius:50px; background:rgba(37,211,102,0.1); border:1px solid rgba(37,211,102,0.25); color:#25d366; font-size:13px; font-weight:600; text-decoration:none; transition:all 0.22s; font-family:'Syne',sans-serif; }
        .wa-pill:hover { background:rgba(37,211,102,0.17); transform:translateY(-2px); }

        /* FAQ */
        details { border-bottom:1px solid var(--border-b); padding:16px 0; }
        details summary { cursor:pointer; font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:14px; color:var(--text); list-style:none; display:flex; justify-content:space-between; align-items:center; }
        details summary::-webkit-details-marker { display:none; }
        details summary .plus { color:var(--blue-light); font-size:18px; font-weight:400; flex-shrink:0; margin-left:12px; }
        details p { margin-top:10px; font-size:13px; color:var(--muted); line-height:1.72; max-width:660px; }

        /* FOOTER */
        footer { padding:48px 8vw 30px; border-top:1px solid var(--border); background:rgba(0,0,0,0.22); position:relative; z-index:1; }
        .footer-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; flex-wrap:wrap; gap:24px; }
        .footer-brand { max-width:240px; }
        .footer-logo { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .footer-logo-txt { font-family:'Bricolage Grotesque',sans-serif; font-size:17px; font-weight:800; color:var(--text); }
        .footer-logo-txt span { background:linear-gradient(135deg,#5B9BFF,#00D4FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .footer-tag { font-size:12px; color:var(--muted); line-height:1.6; margin-bottom:8px; }
        .footer-contact { font-size:11px; color:var(--blue-light); font-family:'DM Mono',monospace; }
        .footer-col h5 { font-size:10px; font-weight:700; color:var(--blue-light); letter-spacing:0.12em; text-transform:uppercase; font-family:'DM Mono',monospace; margin-bottom:13px; }
        .footer-col ul { list-style:none; display:flex; flex-direction:column; gap:8px; }
        .footer-col a { font-size:12px; color:var(--muted); text-decoration:none; transition:color 0.2s; }
        .footer-col a:hover { color:var(--text); }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-top:18px; border-top:1px solid rgba(21,101,255,0.07); }
        .footer-copy { font-size:10px; color:var(--muted); font-family:'DM Mono',monospace; }
        .footer-legal { display:flex; gap:14px; }
        .footer-legal a { font-size:10px; color:var(--muted); text-decoration:none; font-family:'DM Mono',monospace; }

        @media(max-width:768px){
          .nav { padding:0 20px; } .nav-links { display:none; }
          .hero,.section,.pos-section,.inv-section,.cta-band { padding-left:5vw; padding-right:5vw; }
          .stats { padding:32px 5vw; }
          .how-grid::before { display:none; }
          footer { padding:40px 5vw 24px; }
        }
      `}</style>

      {/* BG */}
      <div className="bg">
        <div className="bg-orb bg-o1"></div>
        <div className="bg-orb bg-o2"></div>
        <div className="bg-orb bg-o3"></div>
        <div className="bg-grid"></div>
        <div className="bg-shape"></div><div className="bg-shape"></div>
        <div className="bg-shape"></div><div className="bg-shape"></div>
        <div className="bg-shape"></div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* NAV */}
        <nav className="nav">
          <a href="/" className="nav-logo">
            <FZLogo size={36} mono={false} />
            <div className="nav-logo-txt">Fiscal<span>Zone</span></div>
          </a>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#invoices">Invoicing</a></li>
            <li><a href="#pos">Smart POS</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-cta">
            <a href="/auth" className="btn-ghost">Sign In</a>
            <a href="/auth?mode=signup" className="btn-cta">Get Started →</a>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div>
            <div className="eyebrow">ZIMRA Compliant · Zimbabwe</div>
            <h1 className="hero-title">
              Streamline Your<br />
              <span className="grad">POS &amp; Fiscal</span><br />
              System.
            </h1>
            <p className="hero-sub">
              The all-in-one fiscalization platform for Zimbabwe's modern businesses.
              Real-time FDMS sync, A4 &amp; receipt invoicing, offline POS, and smart analytics — fully virtual, zero hardware.
            </p>
            <div className="hero-actions">
              <a href="/auth?mode=signup" className="btn-hero">Start Free Trial →</a>
              <a href="https://wa.me/263779532012" target="_blank" rel="noreferrer" className="btn-hero-ghost">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.936 1.397 5.617L0 24l6.544-1.374A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.652-.493-5.188-1.357l-.372-.22-3.884.816.825-3.793-.242-.39A9.946 9.946 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
                Book a Demo
              </a>
            </div>
            <div className="hero-badges">
              <span className="badge badge-b">FDMS Connected</span>
              <span className="badge badge-b">ZIMRA Certified</span>
              <span className="badge badge-c">A4 PDF Invoices</span>
              <span className="badge badge-c">Thermal Receipts</span>
              <span className="badge badge-b">Offline POS</span>
            </div>
          </div>

          {/* HERO GRAPHIC */}
          <div className="hero-graphic">
            <div className="hg-glow"></div>
            <div className="hg-ring"></div>
            <div className="hg-ring2"></div>
            <div className="hg-fdms"><div className="hg-fdms-dot"></div>FDMS Connected</div>

            {/* Invoice card */}
            <div className="hg-card">
              <div className="hg-tabs">
                <div className="hg-tab active">A4 INVOICE</div>
                <div className="hg-tab inactive">RECEIPT</div>
                <div className="hg-tab inactive">CREDIT NOTE</div>
              </div>
              <div className="hg-card-top">
                <div>
                  <div className="hg-co">Pinnacle Supplies (Pvt)</div>
                  <div className="hg-vat">BP: 40098712</div>
                </div>
                <div className="hg-fiscal">FISCALIZED</div>
              </div>
              <div className="hg-invnum">#INV-2025-0174</div>
              {[["Office Furniture", "$2,800.00"], ["IT Equipment", "$4,500.00"], ["Delivery & Setup", "$350.00"]].map(([l, v], i) => (
                <div key={i} className="hg-row"><span className="hg-lbl">{l}</span><span className="hg-val">{v}</span></div>
              ))}
              <hr className="hg-div" />
              <div className="hg-row"><span className="hg-lbl">Subtotal</span><span className="hg-val">$7,650.00</span></div>
              <div className="hg-row"><span className="hg-lbl">VAT (15%)</span><span className="hg-val">$1,147.50</span></div>
              <hr className="hg-div" />
              <div className="hg-total"><span className="hg-tlbl">Total</span><span className="hg-tval">$8,797.50</span></div>
              <div className="hg-qr">
                <div className="hg-qr-box">⬡</div>
                <div className="hg-qr-txt"><span>Fiscal QR Verified</span><br />Scan to confirm with ZIMRA</div>
              </div>
            </div>

            {/* Pills */}
            <div className="hg-pill hg-p1"><div className="hg-pill-ico">📄</div><div className="hg-pill-val">A4 + Receipt</div><div className="hg-pill-lbl">Invoice Formats</div></div>
            <div className="hg-pill hg-p2"><div className="hg-pill-ico">⚡</div><div className="hg-pill-val">&lt;1s</div><div className="hg-pill-lbl">Sync Latency</div></div>
            <div className="hg-pill hg-p3"><div className="hg-pill-ico">🧾</div><div className="hg-pill-val">$12M+</div><div className="hg-pill-lbl">Processed</div></div>
            <div className="hg-pill hg-p4"><div className="hg-pill-ico">🔐</div><div className="hg-pill-val">99.9%</div><div className="hg-pill-lbl">Uptime</div></div>
            <div className="hg-pill hg-p5"><div className="hg-pill-ico">🏛️</div><div className="hg-pill-val">Certified</div><div className="hg-pill-lbl">ZIMRA Approved</div></div>
            <div className="hg-bars">{[0, 0, 0, 0, 0, 0, 0].map((_, i) => <div key={i} className="hg-bar"></div>)}</div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats">
          <div><div className="stat-val">500+</div><div className="stat-lbl">Businesses Active</div></div>
          <div><div className="stat-val">$12M+</div><div className="stat-lbl">Invoices Processed</div></div>
          <div><div className="stat-val">99.9%</div><div className="stat-lbl">FDMS Uptime</div></div>
          <div><div className="stat-val">&lt;1s</div><div className="stat-lbl">Sync Latency</div></div>
        </div>

        {/* INVOICE & RECEIPT FEATURE */}
        <section className="inv-section" id="invoices">
          <div className="sec-eye">Invoicing</div>
          <h2 className="sec-title">A4 invoices &amp; thermal<br />receipts — beautifully done.</h2>
          <p className="sec-sub">Every transaction produces a ZIMRA-fiscalized document in the format you need — a professional A4 PDF, a compact receipt, or both simultaneously.</p>
          <div className="inv-grid">
            {/* Left: A4 mock */}
            <div className="inv-preview-wrap">
              <div className="inv-preview-tabs">
                <div className="inv-tab on">A4 INVOICE</div>
                <div className="inv-tab off">RECEIPT</div>
              </div>
              <div className="inv-a4">
                <div className="inv-a4-head">
                  <div className="inv-a4-brand">
                    <div className="inv-a4-logo"><FZLogo size={28} mono={false} /></div>
                    <div className="inv-a4-bname">Fiscal<span>Zone</span></div>
                  </div>
                  <div className="inv-a4-tag">
                    <div className="inv-a4-invlbl">FISCAL INVOICE</div>
                    <div className="inv-a4-invnum">#INV-2025-0174</div>
                  </div>
                </div>
                <div className="inv-a4-parties">
                  <div>
                    <div className="inv-a4-party-lbl">From</div>
                    <div className="inv-a4-party-name">Pinnacle Supplies (Pvt)</div>
                    <div className="inv-a4-party-detail">BP: 40098712<br />Harare, Zimbabwe</div>
                  </div>
                  <div>
                    <div className="inv-a4-party-lbl">To</div>
                    <div className="inv-a4-party-name">Mvura Engineering Ltd</div>
                    <div className="inv-a4-party-detail">BP: 40012345<br />Bulawayo, Zimbabwe</div>
                  </div>
                </div>
                <div className="inv-a4-table-head">
                  <div className="inv-a4-th">Description</div>
                  <div className="inv-a4-th" style={{ textAlign: "right" }}>Qty</div>
                  <div className="inv-a4-th" style={{ textAlign: "right" }}>Amount</div>
                </div>
                {[["Office Furniture", "1", "$2,800.00"], ["IT Equipment", "3", "$4,500.00"], ["Delivery & Setup", "1", "$350.00"]].map(([d, q, a], i) => (
                  <div key={i} className="inv-a4-tr">
                    <div className="inv-a4-td">{d}</div>
                    <div className="inv-a4-td muted">{q}</div>
                    <div className="inv-a4-td right">{a}</div>
                  </div>
                ))}
                <div className="inv-a4-totals">
                  <div className="inv-a4-tot-row"><span className="inv-a4-tot-lbl">Subtotal</span><span className="inv-a4-tot-val">$7,650.00</span></div>
                  <div className="inv-a4-tot-row"><span className="inv-a4-tot-lbl">VAT (15%)</span><span className="inv-a4-tot-val">$1,147.50</span></div>
                  <div className="inv-a4-tot-row grand"><span className="inv-a4-tot-lbl">Total</span><span className="inv-a4-tot-val">$8,797.50</span></div>
                </div>
                <div className="inv-a4-footer">
                  <div className="inv-a4-zimra">
                    <div className="inv-a4-qr">⬡</div>
                    <div className="inv-a4-verify"><span>Fiscal QR Verified</span><br />ZIMRA Receipt #FR-2025-00174</div>
                  </div>
                  <div className="inv-a4-stamp">FISCALIZED</div>
                </div>
              </div>
            </div>

            {/* Right: feature points */}
            <div className="inv-points">
              {[
                { ico: "📄", t: "Professional A4 PDF Invoices", d: "Full-page ZIMRA-compliant invoices with your branding, client details, itemized lines, VAT breakdown, and fiscal QR code. Print or email instantly." },
                { ico: "🧾", t: "Thermal & Digital Receipts", d: "Compact receipt view for POS transactions — print via thermal printer or send as a PDF. Both formats carry the ZIMRA fiscal receipt number." },
                { ico: "📋", t: "Credit Notes & Returns", d: "Issue ZIMRA-compliant credit notes directly from any invoice. Automatically reverses the original fiscal submission." },
                { ico: "✉️", t: "Email Delivery & PDF Export", d: "Send invoices and receipts to clients by email straight from the dashboard. Download PDF copies at any time." },
                { ico: "⬡", t: "Cryptographic Fiscal QR Code", d: "Every document embeds a signed QR code your clients can scan to verify authenticity with ZIMRA in real time." },
              ].map((p, i) => (
                <div key={i} className="inv-point">
                  <div className="inv-point-ico">{p.ico}</div>
                  <div className="inv-point-txt">
                    <div className="inv-point-t">{p.t}</div>
                    <div className="inv-point-d">{p.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features">
          <div className="sec-eye">Power Features</div>
          <h2 className="sec-title">Everything you need<br />to succeed.</h2>
          <p className="sec-sub">Built for speed, compliance, and growth. Every feature designed around Zimbabwe's business reality.</p>
          <div className="feat-grid">
            {[
              { icon: "🏛️", tag: "Compliance", title: "ZIMRA Compliant", desc: "Always up to date with the latest tax regulations. Automatic updates keep you compliant without lifting a finger." },
              { icon: "📡", tag: "Integration", title: "FDMS Sync", desc: "Real-time fiscal device synchronization with Zimbabwe's FDMS infrastructure. Zero manual steps, zero delays." },
              { icon: "⬡", tag: "Verification", title: "Smart QR Codes", desc: "Every invoice embeds a cryptographically signed fiscal QR code for instant ZIMRA verification." },
              { icon: "🧮", tag: "Automation", title: "Auto-Tax Engine", desc: "VAT, withholding tax, and multiple rate tiers — calculated automatically on every transaction." },
              { icon: "🖥️", tag: "Point of Sale", title: "Smart POS · Offline", desc: "Complete offline-capable POS for retail. Queues transactions locally, syncs the moment connectivity returns." },
              { icon: "📦", tag: "Stock Control", title: "Inventory Management", desc: "Track stock levels, set reorder alerts, and manage products across multiple locations in real time." },
              { icon: "✉️", tag: "Communication", title: "Email Hosting", desc: "Professional business email under your own domain — fully integrated with invoicing and client communications." },
              { icon: "📊", tag: "Analytics", title: "Smart Analytics", desc: "Revenue trends, tax liabilities, and growth insights — presented in clear dashboards built for decisions." },
            ].map((f, i) => (
              <div key={i} className="feat-card">
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-tag">{f.tag}</div>
                <div className="feat-title">{f.title}</div>
                <p className="feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* POS */}
        <section className="pos-section" id="pos">
          <div className="sec-eye">Point of Sale</div>
          <h2 className="sec-title">Works offline.<br />Syncs instantly.</h2>
          <p className="sec-sub">Internet outages shouldn't stop your business. FiscalZone's POS operates fully offline and auto-syncs to FDMS the moment connectivity returns.</p>
          <div className="pos-grid">
            <div className="pos-mock">
              <div className="pos-header">
                <div className="pos-title-mock">Smart POS Terminal</div>
                <div className="pos-status">Offline · Queued</div>
              </div>
              {[["Bread", "$0.80"], ["Milk 2L", "$1.20"], ["Eggs ×6", "$2.50"], ["Sugar 1kg", "$1.00"], ["Cooking Oil", "$3.40"], ["Chicken", "$5.80"]].map(([n, p], i) => (
                <div key={i} className="pos-item"><span>{n}</span><span>{p}</span></div>
              ))}
              <div className="pos-total"><span className="pos-total-lbl">Cart Total (incl. VAT)</span><span className="pos-total-val">$14.70</span></div>
              <button className="pos-btn">Fiscalize &amp; Print</button>
              <div className="pos-sync-note">⚡ 3 transactions queued — will sync when online</div>
            </div>
            <div className="pos-checks">
              {[
                { t: "Instant FDMS sync when back online", d: "All queued transactions auto-submit the moment connectivity returns." },
                { t: "Thermal receipt + A4 invoice printing", d: "Print compact receipts at the till or send full A4 invoices by email." },
                { t: "Barcode scanner & cash drawer support", d: "Connect your existing hardware — FiscalZone works with standard peripherals." },
                { t: "Multi-cashier, shift management", d: "Assign cashiers, manage shifts, and review per-cashier reports at close of business." },
              ].map((c, i) => (
                <div key={i} className="pos-check">
                  <div className="check-ico">✓</div>
                  <div className="check-txt"><strong>{c.t}</strong><br />{c.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="section">
          <div className="sec-eye">How It Works</div>
          <h2 className="sec-title">Up and running<br />in minutes.</h2>
          <div className="how-grid">
            {[
              { n: "01", t: "Create Your Account", d: "Sign up with your business details and ZIMRA BP number. Verification takes under 2 minutes." },
              { n: "02", t: "Add Products & Clients", d: "Import your product catalogue and customer list. Bulk CSV import supported." },
              { n: "03", t: "Issue Fiscal Invoices", d: "Create A4 invoices or receipts with our visual builder. ZIMRA receipt numbers generated automatically." },
              { n: "04", t: "Stay Compliant", d: "Monitor your fiscal health from the dashboard. Automatic Fiscal Day reports every night." },
            ].map((s, i) => (
              <div key={i} className="how-step">
                <div className="step-n">{s.n}</div>
                <div className="step-t">{s.t}</div>
                <p className="step-d">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section className="section" id="pricing" style={{ background: "rgba(0,0,0,0.1)", borderTop: "1px solid var(--border)" }}>
          <div className="sec-eye">Transparent Pricing</div>
          <h2 className="sec-title">Start for free,<br />scale as you grow.</h2>
          <p className="sec-sub">All paid plans include live FDMS sync, A4 &amp; receipt invoicing, ZIMRA compliance, and local support.</p>
          <div className="price-grid">
            {[
              { tag: "Test Mode", price: "Free", per: "For development & testing", feats: ["Unlimited Invoices (Test)", "A4 & Receipt Preview", "Sandboxed FDMS", "API Access", "Dev Support"], hot: false, cta: "Get Started" },
              { tag: "Production", price: "150", per: "USD / device / year", feats: ["Unlimited Invoices", "A4 PDF + Thermal Receipts", "Live FDMS Sync", "ZIMRA Compliant", "Smart QR Codes", "Auto-Tax Engine", "Priority Support"], hot: true, cta: "Get Started" },
              { tag: "Enterprise", price: "Custom", per: "For large organizations", feats: ["Unlimited Users & Devices", "Custom Invoice Templates", "Dedicated Manager", "SLA Assurance", "Custom Integration", "Email Hosting", "On-premise option"], hot: false, cta: "Contact Sales" },
            ].map((p, i) => (
              <div key={i} className={`price-card${p.hot ? " hot" : ""}`}>
                <div className="plan-tag">{p.tag}</div>
                <div className="plan-price">{p.price !== "Free" && p.price !== "Custom" ? <><sup>$</sup>{p.price}</> : p.price}</div>
                <div className="plan-per">{p.per}</div>
                <ul className="plan-feats">{p.feats.map((f, j) => <li key={j}>{f}</li>)}</ul>
                <button className={`btn-plan${p.hot ? " hot-btn" : ""}`}>{p.cta}</button>
              </div>
            ))}
          </div>
        </section>

        {/* TESTI */}
        <section className="section">
          <div className="sec-eye">What Clients Say</div>
          <h2 className="sec-title">Trusted across<br />Zimbabwe.</h2>
          <div className="testi-grid">
            {[
              { q: "FiscalZone cut our invoicing time from 30 minutes to under 2. The A4 invoices look completely professional and the FDMS integration hasn't failed once.", name: "Tendai M.", role: "CFO — Harare Retail Group" },
              { q: "The offline POS was a game-changer. Our branch in Mutare had constant connectivity issues and those problems simply don't affect us anymore.", name: "Rudo K.", role: "Owner — Bulawayo Auto Parts" },
              { q: "The Smart Analytics dashboard gives our finance team real-time visibility into tax liabilities. Our auditors love the clean PDF export reports.", name: "Simba C.", role: "Finance Director — Zim Logistics Ltd" },
            ].map((t, i) => (
              <div key={i} className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-q">"{t.q}"</p>
                <div className="testi-who">
                  <div className="testi-av">{t.name[0]}</div>
                  <div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq" style={{ background: "rgba(21,101,255,0.02)", borderTop: "1px solid var(--border)" }}>
          <div className="sec-eye">FAQ</div>
          <h2 className="sec-title">Frequently asked<br />questions.</h2>
          <div style={{ marginTop: 40 }}>
            {[
              { q: "What is ZIMRA compliance and why do I need it?", a: "ZIMRA requires all VAT-registered businesses to submit invoice data to the FDMS in real time. FiscalZone handles this automatically — no physical fiscal device required." },
              { q: "What invoice formats does FiscalZone produce?", a: "FiscalZone produces full A4 PDF invoices for professional billing, compact thermal receipts for POS transactions, and credit notes for returns. Every document carries a ZIMRA fiscal receipt number and QR code." },
              { q: "How does the FDMS integration work?", a: "Every invoice is cryptographically signed and submitted to ZIMRA's FDMS via our certified API. You receive a fiscal receipt number in under a second." },
              { q: "Can I try FiscalZone before committing?", a: "Yes — our Test Mode plan is completely free with unlimited test invoices, A4 and receipt previews, sandboxed FDMS, and API access. No credit card needed." },
              { q: "Does the POS work without internet?", a: "Absolutely. The Smart POS queues all transactions locally when offline and syncs them to FDMS the moment connectivity returns. No data is ever lost." },
              { q: "Is my financial data secure?", a: "All data is encrypted at rest and in transit using AES-256. We use role-based access controls, full audit logs, and daily backups." },
            ].map((item, i) => (
              <details key={i}>
                <summary>{item.q}<span className="plus">+</span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-band">
          <div className="sec-eye" style={{ justifyContent: "center" }}>Ready to Start?</div>
          <h2 className="cta-title">Get <span className="grad">fiscal-ready</span><br />in minutes.</h2>
          <p className="cta-sub">Join 500+ Zimbabwean businesses that trust FiscalZone for seamless, automated ZIMRA compliance.</p>
          <div className="cta-row">
            <a href="/auth?mode=signup" className="btn-hero">Start Free Trial →</a>
            <a href="https://wa.me/263779532012" target="_blank" rel="noreferrer" className="wa-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.936 1.397 5.617L0 24l6.544-1.374A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.652-.493-5.188-1.357l-.372-.22-3.884.816.825-3.793-.242-.39A9.946 9.946 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              +263 779 532 012
            </a>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <FZLogo size={28} mono={false} />
                <div className="footer-logo-txt">Fiscal<span>Zone</span></div>
              </div>
              <p className="footer-tag">Zimbabwe's intelligent fiscalization platform. Built for compliance, designed for growth.</p>
              <div className="footer-contact">info@fiscalzone.co.zw · www.fiscalzone.co.zw</div>
            </div>
            <div className="footer-col">
              <h5>Platform</h5>
              <ul>
                <li><a href="#">A4 & Receipt Invoicing</a></li>
                <li><a href="#">FDMS Sync</a></li>
                <li><a href="#">Smart POS</a></li>
                <li><a href="#">Inventory</a></li>
                <li><a href="#">Email Hosting</a></li>
                <li><a href="#">Analytics</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Contact & Support</h5>
              <ul>
                <li><a href="https://wa.me/263779532012">WhatsApp: 0779532012</a></li>
                <li><a href="tel:0779555522">Phone: 0779555522</a></li>
                <li><a href="mailto:info@fiscalzone.co.zw">info@fiscalzone.co.zw</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© {new Date().getFullYear()} FiscalZone. Made with ♥ in Zimbabwe.</div>
            <div className="footer-legal"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a></div>
          </div>
        </footer>

      </div>
    </>
  );
}