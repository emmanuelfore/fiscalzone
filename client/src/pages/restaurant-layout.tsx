import { useAuth } from "@/hooks/use-auth";
import { Company } from "@shared/schema";
import { RestaurantSettings } from "@/components/settings/restaurant-settings";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Utensils, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

import { useActiveCompany } from "@/hooks/use-active-company";
import { useUpdateCompany } from "@/hooks/use-companies";

export default function RestaurantLayoutPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { activeCompany: company, isLoading } = useActiveCompany();
    const updateCompany = useUpdateCompany(company?.id || 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!company) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <h2 className="text-2xl font-bold">Company not found</h2>
                    <p className="text-muted-foreground text-center max-w-md">
                        We couldn't find an active company for your account. 
                        Please ensure you are assigned to a company or create one to continue.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
                        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Floor Manager</h1>
                        <p className="text-muted-foreground">Manage your restaurant sections and table layout.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="hover:bg-accent/10 transition-colors cursor-pointer border-zinc-200/50 shadow-lg bg-white/5 backdrop-blur-sm" onClick={() => setLocation("/restaurant/kds")}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Utensils className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Kitchen Display (KDS)</CardTitle>
                                <CardDescription>View and manage active orders for the kitchen.</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                    <Card className="hover:bg-accent/10 transition-colors cursor-pointer border-zinc-200/50 shadow-lg bg-white/5 backdrop-blur-sm" onClick={() => window.open(`/order-status?companyId=${company.id}`, '_blank')}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Monitor className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Customer Order Board</CardTitle>
                                <CardDescription>Open the public status screen for customers.</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                <Card className="border-none shadow-xl bg-card/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Restaurant Configuration</CardTitle>
                        <CardDescription>
                            Configure your restaurant floor plan and view table statuses.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RestaurantSettings 
                            company={company} 
                            onUpdate={async (data: any) => { 
                                await updateCompany.mutateAsync(data); 
                            }} 
                        />
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
