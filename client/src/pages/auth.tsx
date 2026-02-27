import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, isLoading, loginWithPassword, registerWithPassword } = useAuth();
  // Gate on !!user so this never fires when unauthenticated
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [, setLocation] = useLocation();

  const getInitialMode = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("mode") === "signup" ? "signup" : "login";
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError(null);
      setIsLoggingIn(true);
      await registerWithPassword({
        email: signupData.email,
        password: signupData.password,
        name: signupData.name
      });
      setSuccessMsg("Account created! Logging you in...");
    } catch (error: any) {
      console.error("Signup failed:", error);
      setError(error.message || "Registration failed");
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (user && !isLoading && !isLoadingCompanies) {
      if (companies && companies.length > 0) {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
    }
  }, [user, companies, isLoading, isLoadingCompanies, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to={companies && companies.length > 0 ? "/dashboard" : "/onboarding"} />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 max-w-lg">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl mb-8 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
            Z
          </div>
          <h1 className="text-4xl font-display font-bold mb-6 leading-tight text-white">
            Seamless ZIMRA Compliant Invoicing.
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            Manage customers, products, and fiscalization in one secure platform.
            Automate your compliance and focus on growth.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300">
              FDMS Ready
            </div>
            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300">
              Secure
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-6 bg-slate-50 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        <Card className="w-full max-w-md card-depth border-none relative z-10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your account"
                : "Enter your details to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-500 text-sm border border-red-100">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-md bg-emerald-50 text-emerald-600 text-sm border border-emerald-100">
                {successMsg}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button variant="link" className="p-0 h-auto text-xs text-primary" type="button">
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>

                <div className="text-center text-sm text-slate-500 mt-4">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(null); }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>

                <div className="text-center text-sm text-slate-500 mt-4">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(null); }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}