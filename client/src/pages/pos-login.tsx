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
    if (user && !isLoading && !isLoadingCompanies) {
      setLocation("/pos");
    }
  }, [user, companies, isLoading, isLoadingCompanies, setLocation]);

  if (isLoading) {
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden p-6 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-6">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">POS Desktop</h1>
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
          &copy; 2026 Fiscal Stack Desktop v1.0
        </p>
      </div>
    </div>
  );
}
