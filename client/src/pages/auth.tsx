import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const { user, loginWithPassword, registerWithPassword } = useAuth();
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
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login State
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  // Signup Form
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setIsLoggingIn(true);
      // Clear any stale company selection before login
      localStorage.removeItem("selectedCompanyId");
      await loginWithPassword({ email: loginData.email, password: loginData.password });
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || "Invalid email or password");
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (values: SignupForm) => {
    try {
      setError(null);
      setIsLoggingIn(true);

      // Clear any stale company selection before signup
      localStorage.removeItem("selectedCompanyId");

      const data = await registerWithPassword({
        email: values.email,
        password: values.password,
        name: values.name
      });

      if (data?.session) {
        setSuccessMsg("Account created! Redirecting to onboarding...");
        setTimeout(() => setLocation("/onboarding"), 1500);
      } else if (data?.user && !data?.session) {
        setSuccessMsg("Account created! Please check your email to verify your account before logging in.");
        setIsLoggingIn(false);
      } else {
        setSuccessMsg("Account created! Redirecting...");
        setTimeout(() => setLocation("/onboarding"), 1500);
      }
    } catch (err: any) {
      console.error("Signup failed:", err);

      // Specifically handle unique email constraint from Supabase
      if (err.message?.toLowerCase().includes("user already registered")) {
        signupForm.setError("email", {
          type: "manual",
          message: "This email is already registered. Please sign in or use a different email."
        });
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
      setIsLoggingIn(false);
    }
  };

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
          <div className="mb-8">
            <img
              src="/fiscalstack-logo.png"
              alt="FiscalStack Logo"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
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
                    name="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button variant="ghost" className="p-0 h-auto text-xs text-primary hover:bg-transparent" type="button">
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
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
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    {...signupForm.register("name")}
                    autoComplete="name"
                    placeholder="John Doe"
                    required
                  />
                  {signupForm.formState.errors.name && (
                    <p className="text-xs text-red-500">{signupForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    {...signupForm.register("email")}
                    autoComplete="email"
                    placeholder="name@company.com"
                    required
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-red-500">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    {...signupForm.register("password")}
                    autoComplete="new-password"
                    required
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-red-500">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    {...signupForm.register("confirmPassword")}
                    autoComplete="new-password"
                    required
                  />
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-500">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>

                <div className="text-center text-sm text-slate-500 mt-4">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
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
