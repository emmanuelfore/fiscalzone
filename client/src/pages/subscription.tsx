import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Settings, Server, CheckCircle2, AlertTriangle, RefreshCw, Activity, Wifi, WifiOff, Loader2, Zap, ShieldCheck, CreditCard, Cpu, AlertCircle, Globe, UserCog } from "lucide-react";

export default function SubscriptionPage() {
    const { user } = useAuth();
    const { activeCompany, isLoading: loadingCompany } = useActiveCompany();
    const { toast } = useToast();
    const [targetSerialNo, setTargetSerialNo] = useState("");
    const [macAddress, setMacAddress] = useState("");
    const [email, setEmail] = useState("");
    const [pollReference, setPollReference] = useState<string | null>(null);

    // Manual Activation State (Super Admin)
    const [manualAmount, setManualAmount] = useState("150");
    const [manualNotes, setManualNotes] = useState("");
    const [manualSerialNo, setManualSerialNo] = useState("");
    const [manualMacAddress, setManualMacAddress] = useState("");

    // Set initial manual values when company data is available
    useEffect(() => {
        if (activeCompany) {
            setManualSerialNo(activeCompany.fdmsDeviceSerialNo || "");
            setManualMacAddress(activeCompany.registeredMacAddress || macAddress || "");
        }
    }, [activeCompany, macAddress]);

    const { data: subscriptions = [], isLoading: loadingSubs, refetch: refetchSubs } = useQuery({
        queryKey: [`/api/companies/${activeCompany?.id}/subscriptions`],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${activeCompany?.id}/subscriptions`);
            return res.json();
        },
        enabled: !!activeCompany?.id
    });

    // Set initial values from activeCompany only if it's the first time
    useEffect(() => {
        if (activeCompany?.fdmsDeviceSerialNo && !targetSerialNo) {
            setTargetSerialNo(activeCompany.fdmsDeviceSerialNo);
        }
        if (activeCompany?.registeredMacAddress && !macAddress) {
            setMacAddress(activeCompany.registeredMacAddress);
        }
    }, [activeCompany]);

    const detectMacAddress = async () => {
        try {
            const res = await apiFetch("/api/system/mac-address");
            const data = await res.json();
            if (data.macAddresses && data.macAddresses.length > 0) {
                setMacAddress(data.macAddresses[0]);
                toast({ title: "Hardware Detected", description: `Automatically identified machine: ${data.macAddresses[0]}` });
            } else {
                toast({ title: "Detection Failed", description: "Could not identify any physical network interfaces.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Error", description: "Failed to communicate with local hardware service.", variant: "destructive" });
        }
    };

    const initiateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${activeCompany?.id}/subscriptions/initiate`, {
                method: "POST",
                body: JSON.stringify({ amount: 150, macAddress, email, serialNo: targetSerialNo })
            });
            if (!res.ok) throw await res.json();
            return await res.json();
        },
        onSuccess: (data) => {
            if (data.redirectUrl) {
                window.open(data.redirectUrl, "_blank");
                setPollReference(data.reference);
                toast({ title: "Payment Initiated", description: "Please complete payment in the new tab." });
            }
        },
        onError: (err: any) => {
            toast({ title: "Failed to initiate payment", description: err.message, variant: "destructive" });
        }
    });

    const manualActivateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/admin/subscriptions/manual`, {
                method: "POST",
                body: JSON.stringify({
                    companyId: activeCompany?.id,
                    serialNo: manualSerialNo,
                    macAddress: manualMacAddress,
                    amount: manualAmount,
                    notes: manualNotes
                })
            });
            if (!res.ok) throw await res.json();
            return await res.json();
        },
        onSuccess: () => {
            refetchSubs();
            toast({ title: "Success", description: "Subscription activated manually!" });
            setManualNotes("");
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message || "Failed to activate subscription manually", variant: "destructive" });
        }
    });

    const { data: statusData } = useQuery({
        queryKey: [`/api/subscriptions/${pollReference}/status`],
        queryFn: async () => {
            const res = await apiFetch(`/api/subscriptions/${pollReference}/status`);
            const data = await res.json();
            if (data.status === "Paid") {
                refetchSubs();
                toast({ title: "Success", description: "Subscription activated!" });
            }
            return data;
        },
        enabled: !!pollReference,
        refetchInterval: (query: any) => {
            const data = query.state.data;
            return (data?.status === "Paid" || data?.status === "Cancelled" || data?.status === "Failed") ? false : 3000;
        }
    });

    if (loadingCompany || loadingSubs) return <Layout><div className="p-8">Loading...</div></Layout>;

    const activeSubs = subscriptions.filter((s: any) => s.status === "paid" && new Date(s.endDate) > new Date());
    const isThisDeviceSubscribed = activeSubs.some((s: any) => s.deviceMacAddress === macAddress);

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Subscription & Licensing</h1>
                <p className="text-slate-500 mt-1">Manage physical hardware bindings for ZIMRA production access.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Active Devices List */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-green-500" />
                                Subscribed Devices
                            </CardTitle>
                            <CardDescription>Devices listed below are authorized to use Production ZIMRA services.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeSubs.length > 0 ? (
                                <div className="space-y-3">
                                    {activeSubs.map((sub: any) => (
                                        <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded border">
                                                    <Cpu className="w-4 h-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 font-mono">{sub.deviceMacAddress}</div>
                                                    <div className="text-[11px] text-slate-500">Serial: {sub.deviceSerialNo}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">ACTIVE</Badge>
                                                <div className="text-[10px] text-slate-400 mt-1">Expires: {new Date(sub.endDate).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 border border-dashed rounded-lg text-center">
                                    <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">No active device subscriptions found.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add New Device / Renew */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-500" />
                                {isThisDeviceSubscribed ? "Renew or Add Device" : "Activate New Device"}
                            </CardTitle>
                            <CardDescription>Bind a physical machine to your ZIMRA account.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="serial">ZIMRA Device Serial Number</Label>
                                    <Input
                                        id="serial"
                                        placeholder="e.g. FDMS000000"
                                        value={targetSerialNo}
                                        onChange={(e) => setTargetSerialNo(e.target.value)}
                                        disabled={initiateMutation.isPending}
                                    />
                                    <p className="text-[10px] text-slate-400">Must match the Production Serial Number provided by ZIMRA.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mac">Machine MAC Address</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="mac"
                                            placeholder="Click 'Detect' to identify hardware"
                                            value={macAddress}
                                            onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                                            disabled={initiateMutation.isPending}
                                            readOnly
                                            className="flex-1 bg-slate-50 font-mono"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={detectMacAddress}
                                            className="px-3"
                                            title="Detect local machine"
                                        >
                                            <Wifi className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Enter the MAC address of the device you want to license.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Billing Email (Optional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={initiateMutation.isPending}
                                />
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <strong>One-to-One Binding</strong>: Each physical device requires its own **$150.00 USD / year** subscription. MAC addresses are used to verify the hardware identity.
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                                onClick={() => initiateMutation.mutate()}
                                disabled={initiateMutation.isPending || !macAddress || !targetSerialNo}
                            >
                                {initiateMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <CreditCard className="w-5 h-5 mr-2" />
                                )}
                                Pay $150.00 / year for {targetSerialNo || macAddress || "New Device"}
                            </Button>

                            {pollReference && statusData?.status !== "Paid" && (
                                <div className="mt-4 p-4 border rounded-lg bg-blue-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                                        <span className="text-sm font-medium">Waiting for payment confirmation...</span>
                                    </div>
                                    <Badge variant="outline" className="border-blue-200 text-blue-700">
                                        {statusData?.status || "PENDING"}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm">Multi-Device Support</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-start gap-2 text-xs">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <span>You can license multiple machines per account.</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <span>Switching machines requires a new license.</span>
                            </div>
                            <div className="flex items-start gap-2 text-xs">
                                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Global enforcement across all API endpoints.</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-slate-900 text-white">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-400" />
                                Cash Payments
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-slate-300">
                            <p>To pay via Cash or Bank Transfer:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Note your **MAC Address** above.</li>
                                <li>Visit our office or contact support.</li>
                                <li>Provide your **Device Serial**.</li>
                            </ol>
                            <div className="pt-2 border-t border-slate-800">
                                <p className="font-bold text-blue-400">Support: +263 ...</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Super Admin Manual Activation */}
                    {user?.isSuperAdmin && (
                        <Card className="border-none shadow-sm bg-amber-50 border-amber-200">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
                                    <UserCog className="w-4 h-4" />
                                    Super Admin: Manual Activation
                                </CardTitle>
                                <CardDescription className="text-amber-800/70">Record a cash payment and activate immediately.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="manualSerial" className="text-amber-900">Device Serial</Label>
                                        <Input
                                            id="manualSerial"
                                            value={manualSerialNo}
                                            onChange={(e) => setManualSerialNo(e.target.value)}
                                            className="bg-white border-amber-200"
                                            placeholder="FDMS000000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manualMac" className="text-amber-900">MAC Address</Label>
                                        <Input
                                            id="manualMac"
                                            value={manualMacAddress}
                                            onChange={(e) => setManualMacAddress(e.target.value)}
                                            className="bg-white border-amber-200"
                                            placeholder="00:00:00:00:00:00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manualAmount" className="text-amber-900">Amount (USD)</Label>
                                    <Input
                                        id="manualAmount"
                                        value={manualAmount}
                                        onChange={(e) => setManualAmount(e.target.value)}
                                        className="bg-white border-amber-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manualNotes" className="text-amber-900">Internal Notes</Label>
                                    <Input
                                        id="manualNotes"
                                        placeholder="e.g. Received $150 cash at office"
                                        value={manualNotes}
                                        onChange={(e) => setManualNotes(e.target.value)}
                                        className="bg-white border-amber-200"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                    onClick={() => manualActivateMutation.mutate()}
                                    disabled={manualActivateMutation.isPending || !manualMacAddress || !manualSerialNo}
                                >
                                    {manualActivateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    Activate {manualSerialNo || "Device"} Manually
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </Layout>
    );
}
