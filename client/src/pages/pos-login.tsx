import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect, useLocation } from "wouter";
import { Loader2, Store, Lock, Mail, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsOnline } from "@/hooks/use-is-online";

export default function PosLoginPage() {
  const { user, isLoading, loginWithPassword } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const isOnline = useIsOnline();
  const [updateInfo, setUpdateInfo] = useState<{ version: string; releaseNotes?: string } | null>(null);
  // Safety valve: never show spinner for more than 2s on the login page
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setLoadingTimedOut(true), 2000);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((info) => setUpdateInfo(info));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setIsLoggingIn(true);
      await loginWithPassword({ email: loginData.email, password: loginData.password });
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || "Invalid email or password");
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    // In Electron, redirect as soon as user is authenticated — don't wait for companies
    // since they load from IndexedDB cache on the POS page itself.
    const isElectronApp = !!(window as any).electronAPI;
    if (user && !isLoading && (isElectronApp || !isLoadingCompanies)) {
      setLocation("/pos");
    }
  }, [user, companies, isLoading, isLoadingCompanies, setLocation]);

  if (isLoading && !loadingTimedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/pos" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      {updateInfo && (
        <div className="bg-blue-500 text-white p-3 flex items-center justify-between z-50">
          <span>Update available: v{updateInfo.version}</span>
          <button
            className="px-3 py-1 bg-white text-blue-600 rounded font-semibold text-sm hover:bg-blue-50 transition-colors"
            onClick={() => window.electronAPI?.installUpdate()}
          >
            Install &amp; Restart
          </button>
        </div>
      )}
    <div className="flex-1 flex items-center justify-center relative overflow-hidden p-6">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">

          <p className="text-slate-400 font-medium">Terminal Login</p>
          {!isOnline && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-sm font-semibold">
              <WifiOff className="w-4 h-4" />
              Offline Mode
            </div>
          )}
        </div>

        <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="text-xl font-bold text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-400">Sign in to start your shift</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="cashier@store.com"
                    className="bg-white/5 border-white/10 h-14 pl-11 rounded-2xl text-white placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" title="password" className="text-slate-300">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    className="bg-white/5 border-white/10 h-14 pl-11 rounded-2xl text-white placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Authorize
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-8 uppercase tracking-widest font-bold">
          &copy; 2026 FieldPos Desktop v1.0
        </p>
      </div>
    </div>
    </div>
  );
}
