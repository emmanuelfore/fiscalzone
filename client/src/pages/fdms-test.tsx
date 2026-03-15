import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Play, RotateCcw, Monitor, ShieldCheck, FileText, ChevronRight, Activity, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FdmsTestPage() {
    const { toast } = useToast();
    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;

    const { data: companies } = useCompanies();
    const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = currentCompany?.id || 0;

    const [responseLog, setResponseLog] = useState<string>("Ready to test...");
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const log = (title: string, data: any) => {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[${timestamp}] ${title}\n${JSON.stringify(data, null, 2)}\n\n`;
        setResponseLog(prev => entry + prev);
    };

    const runAction = async (name: string, endpoint: string, method: string = "POST", body?: any) => {
        setLoadingAction(name);
        try {
            const res = await apiFetch(`/api/companies/${companyId}${endpoint}`, {
                method,
                body: body ? JSON.stringify(body) : undefined
            });

            const data = await res.json();
            log(`${method} ${endpoint} (${res.status})`, data);

            if (!res.ok) {
                toast({ title: "Action Failed", description: data.message || "Error occurred", variant: "destructive" });
            } else {
                toast({ title: "Success", description: `${name} completed` });
            }
        } catch (error: any) {
            log(`${name} Error`, { message: error.message });
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(null);
        }
    };

    if (!currentCompany) return <Layout><div className="p-8">No company selected</div></Layout>;

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">FDMS API Tester</h1>
                <p className="text-slate-500 mt-1">Directly invoke ZIMRA FDMS endpoints for testing and verification.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Actions Column */}
                <div className="lg:col-span-1 space-y-6">

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                                <Monitor className="w-4 h-4 mr-2 text-blue-600" />
                                Device Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => runAction("Get Status", "/zimra/status", "GET")}
                                disabled={!!loadingAction}
                            >
                                <Activity className="w-4 h-4 mr-2" />
                                Get Device Status
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => runAction("Ping Server", "/zimra/ping", "POST")}
                                disabled={!!loadingAction}
                            >
                                <Activity className="w-4 h-4 mr-2" />
                                Ping Server
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => runAction("Connectivity Test", "/zimra/connectivity-test", "POST")}
                                disabled={!!loadingAction}
                            >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Full Connectivity Test
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                                <RotateCcw className="w-4 h-4 mr-2 text-amber-600" />
                                Fiscal Day Operations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => runAction("Open Fiscal Day", "/zimra/day/open", "POST")}
                                disabled={!!loadingAction}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Open Fiscal Day
                            </Button>
                            <Button
                                className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => runAction("Close Fiscal Day", "/zimra/day/close", "POST")}
                                disabled={!!loadingAction}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Close Fiscal Day
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                                <FileText className="w-4 h-4 mr-2 text-slate-600" />
                                Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                variant="secondary"
                                className="w-full justify-start"
                                onClick={() => runAction("Sync Config", "/zimra/config/sync", "POST")}
                                disabled={!!loadingAction}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Sync Tax Configuration
                            </Button>
                            <Button
                                variant="secondary"
                                className="w-full justify-start"
                                onClick={() => runAction("Verify Taxpayer", "/zimra/verify-taxpayer", "POST", {
                                    deviceId: currentCompany.fdmsDeviceId,
                                    activationKey: currentCompany.fdmsApiKey,
                                    deviceSerialNo: "TEST-SERIAL"
                                })}
                                disabled={!!loadingAction}
                            >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Verify Taxpayer Info
                            </Button>
                        </CardContent>
                    </Card>

                </div>

                {/* Console Column */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="pb-2 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="font-mono text-sm uppercase text-slate-500">Response Console</CardTitle>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setResponseLog("")}>Clear</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 min-h-[500px] bg-slate-950 text-slate-50 font-mono text-xs overflow-hidden rounded-b-lg">
                            <textarea
                                className="w-full h-full bg-slate-950 p-4 resize-none focus:outline-none text-green-400 font-mono"
                                value={responseLog}
                                readOnly
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
