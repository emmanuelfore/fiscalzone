import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  RefreshCw, 
  Activity, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Zap, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DayManagementControls } from "@/components/zimra/day-management-controls";
import { getZimraErrorMessage } from "@/lib/zimra-errors";

interface ZimraDeviceSettingsProps {
  company: any;
}

export function ZimraDeviceSettings({ company }: ZimraDeviceSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState(company.fdmsDeviceId || "");
  const [activationKey, setActivationKey] = useState(company.fdmsApiKey || "");
  const [deviceSerialNo, setDeviceSerialNo] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [connectivityResult, setConnectivityResult] = useState<any>(null);
  const [showConnectivityDialog, setShowConnectivityDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isRegistered = !!company.fdmsDeviceId && !!company.zimraCertificate;

  // Verify Taxpayer
  const verifyTaxpayerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/verify-taxpayer`, {
        method: "POST",
        body: JSON.stringify({ deviceId, activationKey, deviceSerialNo })
      });
      if (!res.ok) throw await res.json();
      return await res.json();
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      toast({ title: "Taxpayer Verified", description: `Name: ${data.taxPayerName}, TIN: ${data.taxPayerTIN}` });
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({ title: zimraErr.title, description: err.message || zimraErr.message, variant: "destructive" });
    }
  });

  const registerDeviceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/register`, {
        method: "POST",
        body: JSON.stringify({ deviceId, activationKey, deviceSerialNo })
      });
      if (!res.ok) throw await res.json();
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsEditing(false);
      toast({ title: "Device Registered Successfully!", className: "bg-green-100 text-green-900" });
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({ title: zimraErr.title, description: err.message || zimraErr.message, variant: "destructive" });
    }
  });

  const syncConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/config/sync`, { method: "POST" });
      if (!res.ok) throw await res.json();
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Configuration Synced", description: `Updated ${data.taxLevels.length} tax levels.`, className: "bg-green-100 text-green-900" });
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({ title: zimraErr.title, description: err.message || zimraErr.message, variant: "destructive" });
    }
  });

  const switchEnvironmentMutation = useMutation({
    mutationFn: async (env: string) => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/environment`, {
        method: "POST",
        body: JSON.stringify({ environment: env })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to switch environment");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      const env = data.currentEnvironment || "unknown";
      toast({
        title: "Environment Switched",
        description: `Now using ZIMRA ${env.toUpperCase()} endpoint.`,
        className: env === 'production' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
      });
    },
    onError: (err: Error) => {
      toast({ title: "Switch Failed", description: err.message, variant: "destructive" });
    }
  });

  const testConnectivityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/connectivity-test`, { method: "POST" });
      if (!res.ok) throw new Error("Connectivity test failed to execute");
      return await res.json();
    },
    onSuccess: (data) => {
      setConnectivityResult(data);
      if (data.overallStatus === "Online") {
        toast({ title: "Device Online", description: "Connection to ZIMRA is healthy.", className: "bg-green-100 text-green-900" });
      } else {
        toast({ title: "Connection Issues", description: "Status: " + data.overallStatus, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (err: Error) => {
      toast({ title: "Test Failed", description: err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (isRegistered) {
      testConnectivityMutation.mutate();
    }
  }, []);

  const { data: subscriptions = [] } = useQuery({
    queryKey: [`/api/companies/${company.id}/subscriptions`],
    queryFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/subscriptions`);
      return res.json();
    }
  });

  const isOnline = testConnectivityMutation.data?.overallStatus === 'Online';
  const isPinging = testConnectivityMutation.isPending;
  const hasActiveSub = subscriptions.some((s: any) => 
    s.status === "paid" && new Date(s.endDate) > new Date()
  ) || company.subscriptionStatus === 'active';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ZIMRA Fiscal Device</h2>
          <p className="text-sm text-slate-500">Manage your connection to the ZIMRA fiscal gateway</p>
        </div>
        <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner border border-slate-200/50">
          <Button
            variant={company.zimraEnvironment === 'test' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-lg px-4 h-8 text-xs font-bold"
            onClick={() => switchEnvironmentMutation.mutate('test')}
            disabled={switchEnvironmentMutation.isPending || company.zimraEnvironment === 'test'}
          >
            TEST
          </Button>
          <Button
            variant={company.zimraEnvironment === 'production' ? 'destructive' : 'ghost'}
            size="sm"
            className={`rounded-lg px-4 h-8 text-xs font-bold ${company.zimraEnvironment === 'production' ? 'bg-red-600 hover:bg-red-700 active:scale-95' : ''}`}
            onClick={() => {
              if (!hasActiveSub) {
                toast({ title: "Subscription Required", description: "An active subscription is required for Production mode.", variant: "destructive" });
                return;
              }
              if (confirm("⚠️ CAUTION: Real fiscal data will be submitted in PRODUCTION. Proceed?")) {
                switchEnvironmentMutation.mutate('production');
              }
            }}
            disabled={switchEnvironmentMutation.isPending || company.zimraEnvironment === 'production'}
          >
            PRODUCTION
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${company.subscriptionStatus === 'active' ? 'bg-green-100' : 'bg-slate-100'}`}>
            <Zap className={`w-5 h-5 ${company.subscriptionStatus === 'active' ? 'text-green-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Device License</p>
            <div className="flex items-center gap-2 mt-0.5">
              {company.subscriptionStatus === 'active' ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold px-2 py-0 h-5">
                  <ShieldCheck className="w-3 h-3 mr-1" /> ACTIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-bold px-2 py-0 h-5">
                  INACTIVE
                </Badge>
              )}
              {company.subscriptionEndDate && (
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Ends: {new Date(company.subscriptionEndDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs" onClick={() => window.location.href = "/subscription"}>
          Upgrade License
        </Button>
      </div>

      <Card className="card-depth border-none overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-lg flex items-center">
            <Server className="w-5 h-5 mr-2 text-indigo-600" />
            Registration Details
          </CardTitle>
          <CardDescription>Device ID and Keys provided by ZIMRA</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Device ID</Label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="1234567890"
                disabled={isRegistered && !isEditing}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Activation Key</Label>
              <Input
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                type="password"
                placeholder="xxxxxxxx"
                disabled={isRegistered && !isEditing}
                className="bg-white"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Device Serial Number (SN)</Label>
              <Input
                value={deviceSerialNo}
                onChange={(e) => setDeviceSerialNo(e.target.value)}
                placeholder="SN-12345"
                className="bg-white"
              />
            </div>
          </div>

          {!isRegistered || isEditing ? (
            <div className="flex gap-4 pt-4 border-t border-slate-50 mt-4">
              <Button
                variant="outline"
                onClick={() => verifyTaxpayerMutation.mutate()}
                disabled={verifyTaxpayerMutation.isPending || !deviceId || !activationKey || !deviceSerialNo}
                className="flex-1 h-11 rounded-xl font-bold"
              >
                {verifyTaxpayerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "1. Verify Taxpayer"}
              </Button>
              <Button
                onClick={() => registerDeviceMutation.mutate()}
                disabled={registerDeviceMutation.isPending || !deviceId || !activationKey}
                className="flex-1 h-11 rounded-xl font-bold btn-gradient"
              >
                {registerDeviceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (isRegistered ? "Refresh Keys" : "2. Register Device")}
              </Button>
              {isEditing && (
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-11 rounded-xl">Cancel</Button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group transition-all">
               <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {isPinging ? <RefreshCw className="w-6 h-6 animate-spin opacity-50" /> : (isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-none mb-1">
                    {isPinging ? "Syncing..." : (isOnline ? "Device Online" : "Connection Failed")}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                    <span>SN: <span className="text-blue-600 font-mono">{company.fdmsDeviceSerialNo}</span></span>
                    <span className="opacity-30">|</span>
                    <span className="text-indigo-600">{company.fiscalDayOpen ? `Day ${company.currentFiscalDayNo} Open` : 'Day Closed'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowConnectivityDialog(true)} className="h-9 px-3 rounded-xl gap-2 font-bold text-xs">
                  <Activity className="w-3.5 h-3.5" /> Diagnostics
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-9 px-3 rounded-xl font-bold text-xs">
                  Edit Config
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isRegistered && (
        <div className="space-y-6 pt-4 border-t border-slate-100">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Day Controls
              </h4>
              <DayManagementControls company={company} variant="light" />
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Maintenance
              </h4>
              <div className="grid grid-cols-2 gap-2">
                 <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-xs" onClick={() => syncConfigMutation.mutate()} disabled={syncConfigMutation.isPending}>
                  {syncConfigMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                  Sync Tax Config
                </Button>
                <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-xs" onClick={() => testConnectivityMutation.mutate()} disabled={testConnectivityMutation.isPending}>
                  {testConnectivityMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Activity className="w-3.5 h-3.5 mr-2" />}
                  Test Hardware
                </Button>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <AccordionItem value="danger" className="border-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline bg-slate-50/50 text-red-600 font-bold text-xs uppercase tracking-widest">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4" /> Advanced Hardware Reset (Danger Zone)
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-6 bg-white space-y-4">
                <p className="text-xs text-slate-500 italic mb-4">
                  Manual counter overrides are for <strong>catastrophic recovery only</strong>. Incorrect values will stop your business from fiscalizing receipts.
                </p>
                <AdvancedResetControls company={company} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <Dialog open={showConnectivityDialog} onOpenChange={setShowConnectivityDialog}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-display">Connectivity Diagnostics</DialogTitle>
            <DialogDescription className="font-medium">Physical device & Gateway link assessment</DialogDescription>
          </DialogHeader>
          {connectivityResult && (
            <div className="space-y-6 pt-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${connectivityResult.overallStatus === 'Online' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                <span className="font-black text-xs uppercase tracking-widest text-slate-500">Gateway Status</span>
                <Badge className={`px-4 py-1 rounded-full font-black ${connectivityResult.overallStatus === 'Online' ? 'bg-green-600' : 'bg-red-600'}`}>
                  {connectivityResult.overallStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-3">
                {connectivityResult.checks.map((check: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    {check.status === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-500 -mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-500 -mt-0.5 shrink-0" />}
                    <div>
                      <p className="font-bold text-sm text-slate-900 leading-tight">{check.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-300 font-black text-center uppercase tracking-widest pt-4">
                Session ID: {company.id}-{Date.now().toString().slice(-4)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdvancedResetControls({ company }: { company: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [globalNumber, setGlobalNumber] = useState(company.lastReceiptGlobalNo?.toString() || "");
  const [dailyCounter, setDailyCounter] = useState(company.dailyReceiptCount?.toString() || "");
  const [previousHash, setPreviousHash] = useState(company.lastFiscalHash || "");

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/config/reset`, {
        method: "POST",
        body: JSON.stringify({
          globalNumber: globalNumber ? Number(globalNumber) : undefined,
          dailyCounter: dailyCounter ? Number(dailyCounter) : undefined,
          previousHash: previousHash === "" ? "" : previousHash
        })
      });
      if (!res.ok) throw await res.json();
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Counters Fixed", description: "Hardware configuration has been manualy corrected.", className: "bg-orange-100 text-orange-900" });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Last Global Receipt #</Label>
        <Input value={globalNumber} onChange={(e) => setGlobalNumber(e.target.value)} placeholder="0" className="h-10 text-xs font-mono bg-slate-50 border-slate-200" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Last Daily Receipt #</Label>
        <Input value={dailyCounter} onChange={(e) => setDailyCounter(e.target.value)} placeholder="0" className="h-10 text-xs font-mono bg-slate-50 border-slate-200" />
      </div>
      <Button variant="destructive" size="sm" className="h-10 rounded-xl font-bold text-xs shadow-lg shadow-red-200" onClick={() => confirm("⚠️ POTENTIAL COMPLIANCE RISK: Manual reset detected. Confirm?") && resetMutation.mutate()} disabled={resetMutation.isPending}>
        {resetMutation.isPending ? "Applying..." : "Override Counters"}
      </Button>
      <div className="md:col-span-3 space-y-2">
        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Chain Validation Hash (Fiscal Hash)</Label>
        <Input value={previousHash} onChange={(e) => setPreviousHash(e.target.value)} placeholder="Leave empty to clear starting state" className="h-10 text-xs font-mono bg-slate-50 border-slate-200" />
      </div>
    </div>
  );
}
