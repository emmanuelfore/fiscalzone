import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Lock, ShieldCheck } from "lucide-react";

export default function UserProfilePage() {
    const { user, updateProfile, updatePassword } = useAuth();
    const { toast } = useToast();

    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [profileForm, setProfileForm] = useState({
        name: user?.name || "",
    });

    const [passwordForm, setPasswordForm] = useState({
        password: "",
        confirmPassword: "",
    });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsUpdatingProfile(true);
            await updateProfile(profileForm);
            toast({
                title: "Profile Updated",
                description: "Your personal details have been saved.",
                className: "bg-emerald-600 text-white"
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.password !== passwordForm.confirmPassword) {
            toast({
                title: "Passwords do not match",
                description: "Please ensure both password fields match.",
                variant: "destructive",
            });
            return;
        }

        if (passwordForm.password.length < 6) {
            toast({
                title: "Password too weak",
                description: "Password must be at least 6 characters long.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsUpdatingPassword(true);
            await updatePassword(passwordForm.password);
            toast({
                title: "Password Updated",
                description: "Your password has been changed successfully.",
                className: "bg-emerald-600 text-white"
            });
            setPasswordForm({ password: "", confirmPassword: "" });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">User Profile</h1>
                <p className="text-slate-500 mt-1">Manage your account settings and security</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
                {/* Personal Details */}
                <Card className="card-depth border-none">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-xl">Personal Details</CardTitle>
                        </div>
                        <CardDescription>Update your display name and view account info</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" value={user?.email || ""} disabled className="bg-slate-50 text-slate-500" />
                                <p className="text-xs text-slate-400">Email cannot be changed directly.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input
                                    id="name"
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <Button type="submit" disabled={isUpdatingProfile}>
                                {isUpdatingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="card-depth border-none">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <CardTitle className="text-xl">Security</CardTitle>
                        </div>
                        <CardDescription>Update your login password</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={passwordForm.password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                            </div>

                            <Button type="submit" disabled={isUpdatingPassword} variant="outline" className="border-slate-300">
                                {isUpdatingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Update Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
