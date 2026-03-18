import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, isLoading, loginWithPassword, registerWithPassword } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [, setLocation] = useLocation();

  const getInitialMode = () => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("mode") === "signup" ? "signup" : "login";
    }
    return "login";
  };

  const [mode, setMode] = useState<"login" | "signup">(getInitialMode);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setError(null); setIsLoggingIn(true); await loginWithPassword({ email: loginData.email, password: loginData.password }); }
    catch (err: any) { setError(err.message || "Invalid email or password"); setIsLoggingIn(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) { setError("Passwords do not match"); return; }
    try {
      setError(null); setIsLoggingIn(true);
      await registerWithPassword({ email: signupData.email, password: signupData.password, name: signupData.name });
      setSuccessMsg("Account created! Logging you in...");
    } catch (err: any) { setError(err.message || "Registration failed"); setIsLoggingIn(false); }
  };

  useEffect(() => {
    if (user && !isLoading && !isLoadingCompanies) {
      setLocation(companies && companies.length > 0 ? "/dashboard" : "/onboarding");
    }
  }, [user, companies, isLoading, isLoadingCompanies, setLocation]);

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#04080f" }}>
      <Loader2 style={{ color: "#1565FF", width: 36, height: 36 }} className="animate-spin" />
    </div>
  );
  if (user) return <Redirect to={companies && companies.length > 0 ? "/dashboard" : "/onboarding"} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');
        :root {
          --blue: #1565FF; --blue-bright: #2979FF; --blue-light: #5B9BFF;
          --cyan: #00D4FF; --bg: #04080f;
          --surface: rgba(255,255,255,0.03); --border: rgba(21,101,255,0.18);
          --text: #e8f0ff; --muted: rgba(232,240,255,0.45);
        }
        * { box-sizing:border-box; margin:0; padding:0; }

        .auth-root { display:flex; min-height:100vh; background:var(--bg); font-family:'Syne',sans-serif; }

        /* Left panel */
        .auth-left { flex:1; position:relative; display:none; overflow:hidden; }
        @media(min-width:1024px){ .auth-left{display:block;} }

        .auth-left-bg { position:absolute; inset:0; background:#04080f; }
        .auth-lo1 { position:absolute; width:560px; height:560px; border-radius:50%; background:radial-gradient(circle, rgba(21,101,255,0.22) 0%, transparent 70%); top:-120px; right:-120px; filter:blur(70px); animation:lo1 20s ease-in-out infinite; }
        .auth-lo2 { position:absolute; width:450px; height:450px; border-radius:50%; background:radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%); bottom:-100px; left:-80px; filter:blur(70px); animation:lo2 26s ease-in-out infinite; }
        .auth-lgrid { position:absolute; inset:0; background-image:linear-gradient(rgba(21,101,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,101,255,0.06) 1px, transparent 1px); background-size:48px 48px; mask-image:radial-gradient(ellipse 70% 70% at 60% 40%, black 0%, transparent 75%); }
        @keyframes lo1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-45px,40px)} }
        @keyframes lo2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-45px)} }

        .auth-lshape { position:absolute; border:1px solid rgba(21,101,255,0.14); border-radius:3px; animation:lsf ease-in-out infinite; }
        .auth-lshape:nth-child(1){ width:60px; height:60px; top:14%; right:18%; transform:rotate(18deg); animation-duration:22s; }
        .auth-lshape:nth-child(2){ width:38px; height:38px; top:56%; right:8%; border-radius:50%; border-color:rgba(0,212,255,0.14); animation-duration:28s; animation-delay:-9s; }
        .auth-lshape:nth-child(3){ width:82px; height:82px; top:32%; right:38%; border-radius:50%; border-color:rgba(21,101,255,0.07); animation-duration:32s; animation-delay:-15s; }
        @keyframes lsf { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }

        .auth-left-content { position:relative; z-index:10; height:100%; display:flex; flex-direction:column; justify-content:center; padding:64px; }
        .auth-live { display:inline-flex; align-items:center; gap:8px; padding:7px 14px; border-radius:4px; background:rgba(21,101,255,0.1); border:1px solid rgba(21,101,255,0.25); font-family:'DM Mono',monospace; font-size:10px; font-weight:500; color:var(--blue-light); letter-spacing:0.14em; text-transform:uppercase; margin-bottom:36px; width:fit-content; }
        .auth-live-dot { width:6px; height:6px; border-radius:50%; background:var(--blue-light); animation:ldot 2s ease-in-out infinite; }
        @keyframes ldot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .auth-left-title { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(34px,3.2vw,50px); font-weight:800; letter-spacing:-0.04em; color:var(--text); line-height:0.95; margin-bottom:22px; }
        .auth-left-title .grad { background:linear-gradient(135deg,#5B9BFF,#00D4FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .auth-left-sub { font-size:14px; color:var(--muted); line-height:1.7; max-width:350px; margin-bottom:44px; }
        .auth-feat { display:flex; gap:13px; align-items:flex-start; margin-bottom:16px; }
        .auth-feat-chk { width:24px; height:24px; flex-shrink:0; border-radius:6px; background:rgba(0,204,102,0.1); border:1px solid rgba(0,204,102,0.22); display:flex; align-items:center; justify-content:center; color:#00CC66; font-size:11px; margin-top:2px; }
        .auth-feat-txt { font-size:13px; color:var(--muted); line-height:1.6; }
        .auth-feat-txt strong { color:var(--text); font-weight:600; }
        .auth-stats-row { margin-top:44px; padding-top:28px; border-top:1px solid var(--border); display:flex; gap:28px; }
        .auth-sv { font-family:'Bricolage Grotesque',sans-serif; font-size:28px; font-weight:800; background:linear-gradient(135deg,var(--blue-light),var(--cyan)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-0.03em; line-height:1; margin-bottom:3px; }
        .auth-sl { font-size:10px; color:var(--muted); font-family:'DM Mono',monospace; letter-spacing:0.06em; text-transform:uppercase; }

        /* Right form */
        .auth-right { width:100%; display:flex; align-items:center; justify-content:center; padding:40px 32px; position:relative; background:var(--bg); }
        @media(min-width:1024px){ .auth-right{width:480px; flex:none; border-left:1px solid var(--border);} }
        .auth-right-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 60% 40% at 50% 0%, rgba(21,101,255,0.07) 0%, transparent 60%); }

        .auth-card { width:100%; max-width:400px; position:relative; z-index:1; }
        .auth-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:36px; text-decoration:none; }
        .auth-logo-icon { width:38px; height:38px; border-radius:9px; background:linear-gradient(135deg,var(--blue),var(--cyan)); display:flex; align-items:center; justify-content:center; font-size:18px; }
        .auth-logo-txt { font-family:'Bricolage Grotesque',sans-serif; font-size:19px; font-weight:800; color:var(--text); }
        .auth-logo-txt span { background:linear-gradient(135deg,#5B9BFF,#00D4FF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

        .auth-h { font-family:'Bricolage Grotesque',sans-serif; font-size:26px; font-weight:800; letter-spacing:-0.03em; color:var(--text); margin-bottom:7px; }
        .auth-s { font-size:13px; color:var(--muted); margin-bottom:28px; }

        .auth-err { padding:11px 15px; border-radius:6px; background:rgba(255,60,60,0.08); border:1px solid rgba(255,60,60,0.22); color:#ff7070; font-size:12px; margin-bottom:18px; }
        .auth-ok { padding:11px 15px; border-radius:6px; background:rgba(0,204,102,0.08); border:1px solid rgba(0,204,102,0.22); color:#00CC66; font-size:12px; margin-bottom:18px; }

        .auth-form { display:flex; flex-direction:column; gap:16px; }
        .fg { display:flex; flex-direction:column; gap:7px; }
        .flbl { font-size:10px; font-weight:600; color:var(--muted); letter-spacing:0.10em; text-transform:uppercase; font-family:'DM Mono',monospace; }
        .finp { width:100%; padding:11px 15px; border-radius:6px; font-size:14px; background:rgba(255,255,255,0.04); border:1px solid var(--border); color:var(--text); font-family:'Syne',sans-serif; transition:border-color 0.2s, background 0.2s; outline:none; }
        .finp::placeholder { color:rgba(232,240,255,0.2); }
        .finp:focus { border-color:rgba(21,101,255,0.55); background:rgba(21,101,255,0.05); }
        .frow { display:flex; justify-content:space-between; align-items:center; }
        .flink { font-size:11px; color:var(--blue-light); text-decoration:none; font-family:'DM Mono',monospace; letter-spacing:0.04em; }
        .flink:hover { color:var(--cyan); }

        .btn-sub { width:100%; padding:13px; border-radius:6px; font-size:14px; font-weight:700; border:none; background:linear-gradient(135deg,var(--blue),var(--blue-bright)); color:#fff; cursor:pointer; font-family:'Bricolage Grotesque',sans-serif; letter-spacing:-0.01em; transition:all 0.25s; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:4px; box-shadow:0 4px 18px rgba(21,101,255,0.35); }
        .btn-sub:hover:not(:disabled) { box-shadow:0 8px 28px rgba(21,101,255,0.5); transform:translateY(-1px); }
        .btn-sub:disabled { opacity:0.6; cursor:not-allowed; }

        .auth-or { display:flex; align-items:center; gap:12px; margin:18px 0; color:var(--muted); font-size:11px; font-family:'DM Mono',monospace; letter-spacing:0.08em; }
        .auth-or::before, .auth-or::after { content:''; flex:1; height:1px; background:var(--border); }

        .wa-btn { display:flex; align-items:center; justify-content:center; gap:9px; width:100%; padding:11px; border-radius:6px; font-size:13px; font-weight:600; border:1px solid rgba(37,211,102,0.24); color:#25d366; background:rgba(37,211,102,0.06); text-decoration:none; font-family:'Syne',sans-serif; transition:all 0.2s; }
        .wa-btn:hover { background:rgba(37,211,102,0.11); border-color:rgba(37,211,102,0.38); }

        .auth-sw { text-align:center; margin-top:22px; font-size:13px; color:var(--muted); }
        .auth-sw-btn { color:var(--blue-light); font-weight:700; background:none; border:none; cursor:pointer; font-family:'Syne',sans-serif; font-size:13px; padding:0; }
        .auth-sw-btn:hover { color:var(--cyan); text-decoration:underline; }
        .auth-tos { text-align:center; font-size:10px; color:var(--muted); margin-top:18px; font-family:'DM Mono',monospace; letter-spacing:0.04em; line-height:1.6; }
        .auth-tos a { color:var(--blue-light); text-decoration:none; }
      `}</style>

      <div className="auth-root">
        {/* LEFT PANEL */}
        <div className="auth-left">
          <div className="auth-left-bg">
            <div className="auth-lo1"></div>
            <div className="auth-lo2"></div>
            <div className="auth-lgrid"></div>
            <div className="auth-lshape"></div>
            <div className="auth-lshape"></div>
            <div className="auth-lshape"></div>
          </div>
          <div className="auth-left-content">
            <div className="auth-live">
              <div className="auth-live-dot"></div>
              Live Platform
            </div>
            <h2 className="auth-left-title">
              Zimbabwe's<br />
              Smartest<br />
              <span className="grad">Fiscal Platform.</span>
            </h2>
            <p className="auth-left-sub">
              Automate your ZIMRA compliance, issue fiscal invoices, run your POS, and manage your business — all from one dashboard.
            </p>
            {[
              { t: "Instant FDMS Submission", s: "Real-time sync with ZIMRA — certified API" },
              { t: "Fully Virtual System", s: "No hardware needed, server-to-server" },
              { t: "Seamless POS Integration", s: "Connects to existing POS, ERP, e-commerce" },
              { t: "Local Zimbabwe Support", s: "Call 0779532012 or 0779555522" },
            ].map((f, i) => (
              <div key={i} className="auth-feat">
                <div className="auth-feat-chk">✓</div>
                <div className="auth-feat-txt"><strong>{f.t}</strong> — {f.s}</div>
              </div>
            ))}
            <div className="auth-stats-row">
              <div><div className="auth-sv">500+</div><div className="auth-sl">Businesses</div></div>
              <div><div className="auth-sv">99.9%</div><div className="auth-sl">Uptime</div></div>
              <div><div className="auth-sv">24/7</div><div className="auth-sl">Support</div></div>
            </div>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="auth-right">
          <div className="auth-right-glow"></div>
          <div className="auth-card">
            <a href="/" className="auth-logo-wrap">
              <div className="auth-logo-icon">📊</div>
              <div className="auth-logo-txt">Fiscal<span>Zone</span></div>
            </a>

            <h1 className="auth-h">{mode === "login" ? "Welcome back." : "Create account."}</h1>
            <p className="auth-s">{mode === "login" ? "Sign in to your FiscalZone account" : "Start your free trial — no credit card needed"}</p>

            {error && <div className="auth-err">{error}</div>}
            {successMsg && <div className="auth-ok">{successMsg}</div>}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="fg">
                  <label className="flbl">Email Address</label>
                  <input className="finp" type="email" placeholder="name@company.com"
                    value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required />
                </div>
                <div className="fg">
                  <div className="frow">
                    <label className="flbl">Password</label>
                    <a href="#" className="flink">Forgot?</a>
                  </div>
                  <input className="finp" type="password" placeholder="••••••••"
                    value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required />
                </div>
                <button className="btn-sub" type="submit" disabled={isLoggingIn}>
                  {isLoggingIn && <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />}
                  {isLoggingIn ? "Signing in..." : "Sign In →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="auth-form">
                <div className="fg">
                  <label className="flbl">Full Name</label>
                  <input className="finp" placeholder="John Doe"
                    value={signupData.name} onChange={e => setSignupData({ ...signupData, name: e.target.value })} required />
                </div>
                <div className="fg">
                  <label className="flbl">Email Address</label>
                  <input className="finp" type="email" placeholder="name@company.com"
                    value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} required />
                </div>
                <div className="fg">
                  <label className="flbl">Password</label>
                  <input className="finp" type="password" placeholder="Min. 6 characters"
                    value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} required minLength={6} />
                </div>
                <div className="fg">
                  <label className="flbl">Confirm Password</label>
                  <input className="finp" type="password" placeholder="Repeat your password"
                    value={signupData.confirmPassword} onChange={e => setSignupData({ ...signupData, confirmPassword: e.target.value })} required minLength={6} />
                </div>
                <button className="btn-sub" type="submit" disabled={isLoggingIn}>
                  {isLoggingIn && <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />}
                  {isLoggingIn ? "Creating account..." : "Create Account →"}
                </button>
              </form>
            )}

            <div className="auth-or">or</div>
            <a href="https://wa.me/263779532012" target="_blank" rel="noreferrer" className="wa-btn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.936 1.397 5.617L0 24l6.544-1.374A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.652-.493-5.188-1.357l-.372-.22-3.884.816.825-3.793-.242-.39A9.946 9.946 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              Need help? Chat on WhatsApp
            </a>

            <div className="auth-sw">
              {mode === "login" ? (
                <>Don't have an account?{" "}<button className="auth-sw-btn" onClick={() => { setMode("signup"); setError(null); }}>Sign Up Free</button></>
              ) : (
                <>Already have an account?{" "}<button className="auth-sw-btn" onClick={() => { setMode("login"); setError(null); }}>Sign In</button></>
              )}
            </div>
            <div className="auth-tos">
              By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}