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
  const { user, isLoading, loginWithPassword } = useAuth();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies(!!user);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();



  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setIsLoggingIn(true);
      await loginWithPassword({ email: formData.email, password: formData.password });
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || "Invalid email or password");
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
    return <Redirect to="/dashboard" />;
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
            <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>


            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-500 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoggingIn}>
                {isLoggingIn && formData.email ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
