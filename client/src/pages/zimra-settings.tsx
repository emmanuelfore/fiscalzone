import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Settings, Server, CheckCircle2, AlertTriangle, RefreshCw, Activity, Wifi, WifiOff, Loader2, Zap, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DayManagementControls } from "@/components/zimra/day-management-controls";

import { useActiveCompany } from "@/hooks/use-active-company";

export default function ZimraSettingsPage() {
  const { activeCompany, isLoading: isLoadingActive } = useActiveCompany();
  const currentCompany = activeCompany;
  const isLoading = isLoadingActive;

  if (isLoading) return <Layout><div className="p-8">Loading...</div></Layout>;
  if (!currentCompany) return <Layout><div className="p-8">No company details available.</div></Layout>;

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">ZIMRA Device</h1>
          <p className="text-slate-500 mt-1">Manage your fiscal device configuration</p>
        </div>
        <Link href="/zimra-logs">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            View Transaction Logs
          </Button>
        </Link>
      </div>

      <div className="max-w-3xl">
        <Card className="card-depth border-none h-fit">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="w-5 h-5 mr-2 text-green-600" />
              ZIMRA Fiscal Device
            </CardTitle>
            <CardDescription>Configure your device connection and registration status</CardDescription>
          </CardHeader>
          <CardContent>
            <ZimraDeviceConfig company={currentCompany} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

import { getZimraErrorMessage } from "@/lib/zimra-errors";

function ZimraDeviceConfig({ company }: { company: any }) {
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
      if (!res.ok) {
        throw await res.json();
      }
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
        body: JSON.stringify({
          deviceId,
          activationKey,
          deviceSerialNo
        })
      });

      if (!res.ok) {
        throw await res.json();
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsEditing(false); // Exit edit mode on success
      toast({ title: "Device Registered Successfully!", className: "bg-green-100 text-green-900" });
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({ title: zimraErr.title, description: err.message || zimraErr.message, variant: "destructive" });
    }
  });

  const renewCertificateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/issue-certificate`, {
        method: "POST"
      });
      if (!res.ok) {
        throw await res.json();
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Certificate Renewed Successfully!", className: "bg-green-100 text-green-900" });
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({ title: zimraErr.title, description: err.message || zimraErr.message, variant: "destructive" });
    }
  });

  const syncConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/config/sync`, {
        method: "POST"
      });
      if (!res.ok) {
        throw await res.json();
      }
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
        className: "bg-blue-600 text-white"
      });
    },
    onError: (err: Error) => {
      toast({ title: "Switch Failed", description: err.message, variant: "destructive" });
    }
  });

  const testConnectivityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/connectivity-test`, {
        method: "POST"
      });
      if (!res.ok) {
        throw new Error("Connectivity test failed to execute");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setConnectivityResult(data);
      setShowConnectivityDialog(true);
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

  const isOnline = testConnectivityMutation.data?.overallStatus === 'Online';
  // Fetch subscriptions for precise machine-based check
  const { data: subscriptions = [] } = useQuery({
    queryKey: [`/api/companies/${company.id}/subscriptions`],
    queryFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/subscriptions`);
      return res.json();
    }
  });

  const isPinging = testConnectivityMutation.isPending;
  const macAddress = company.registeredMacAddress || "";
  const hasActiveSubForThisMachine = subscriptions.some((s: any) =>
    s.status === "paid" &&
    s.deviceMacAddress === macAddress &&
    new Date(s.endDate) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Environment Toggle */}
      <div className="bg-slate-100 p-1 rounded-lg flex items-center w-fit mb-6">
        <Button
          variant={company.zimraEnvironment === 'test' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-md px-4 h-8 text-xs font-bold"
          onClick={() => switchEnvironmentMutation.mutate('test')}
          disabled={switchEnvironmentMutation.isPending || company.zimraEnvironment === 'test'}
        >
          TEST
        </Button>
        <Button
          variant={company.zimraEnvironment === 'production' ? 'destructive' : 'ghost'}
          size="sm"
          className={`rounded-md px-4 h-8 text-xs font-bold ${company.zimraEnvironment === 'production' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          onClick={() => {
            // Check for general subscription status OR machine-specific one
            // We allow switching if they have ANY active sub for their MAC, even if serial doesn't match yet
            if (!hasActiveSubForThisMachine && company.subscriptionStatus !== 'active') {
              toast({
                title: "Subscription Required",
                description: "An active subscription is required to switch to Production mode.",
                variant: "destructive"
              });
              return;
            }
            if (confirm("⚠️ CAUTION: You are about to switch to the ZIMRA PRODUCTION environment. Real fiscal data will be submitted. Are you sure?")) {
              switchEnvironmentMutation.mutate('production');
            }
          }}
          disabled={switchEnvironmentMutation.isPending || company.zimraEnvironment === 'production'}
        >
          PRODUCTION
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6 p-3 bg-slate-50 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${company.subscriptionStatus === 'active' ? 'bg-green-100' : 'bg-slate-100'}`}>
            <Zap className={`w-4 h-4 ${company.subscriptionStatus === 'active' ? 'text-green-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Device Subscription</p>
            <div className="flex items-center gap-2">
              {company.subscriptionStatus === 'active' ? (
                <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200">
                  <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                  ACTIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-4 bg-slate-50 text-slate-500">
                  INACTIVE
                </Badge>
              )}
              {company.subscriptionEndDate && (
                <span className="text-[10px] text-slate-400">
                  Exp: {new Date(company.subscriptionEndDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href="/subscription">
          <div>
            <p className="text-sm font-semibold text-slate-900">Manage device licenses</p>
            <p className="text-[11px] text-slate-500">Enable production access ($150.00 / year)</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Manage
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Device ID</Label>
          <Input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="1234567890"
            disabled={isRegistered && !isEditing}
          />
        </div>
        <div className="space-y-2">
          <Label>Activation Key</Label>
          <Input
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            type="password"
            placeholder="xxxxxxxx"
            disabled={isRegistered && !isEditing}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Device Serial Number (For Verification)</Label>
          <Input
            value={deviceSerialNo}
            onChange={(e) => setDeviceSerialNo(e.target.value)}
            placeholder="SN-12345"
          />
        </div>
      </div>

      {verificationResult && (
        <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-1">
          <p><strong>TaxPayer:</strong> {verificationResult.taxPayerName}</p>
          <p><strong>TIN:</strong> {verificationResult.taxPayerTIN}</p>
          <p><strong>Address:</strong> {verificationResult.deviceBranchAddress?.city}, {verificationResult.deviceBranchAddress?.street}</p>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        {!isRegistered || isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={() => verifyTaxpayerMutation.mutate()}
              disabled={verifyTaxpayerMutation.isPending || !deviceId || !activationKey || !deviceSerialNo}
            >
              {verifyTaxpayerMutation.isPending ? "Verifying..." : "1. Verify Taxpayer"}
            </Button>
            <Button
              onClick={() => registerDeviceMutation.mutate()}
              disabled={registerDeviceMutation.isPending || !deviceId || !activationKey}
            >
              {registerDeviceMutation.isPending ? "Registering..." : isRegistered ? "Update & Re-Register" : "2. Register Device"}
            </Button>
            {isEditing && (
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setDeviceId(company.fdmsDeviceId || "");
                  setActivationKey(company.fdmsApiKey || "");
                }}
              >
                Cancel
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-md w-full border text-slate-700 bg-slate-50 border-slate-200">
            {isPinging ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            ) : isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {isPinging ? "Checking Connectivity..." : (isOnline ? 'Online & Registered' : 'Offline / Connection Failed')}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs opacity-75">
                  SN: <span className="font-mono font-bold text-blue-600">{company.fdmsDeviceSerialNo || 'Pending'}</span>
                </span>
                <span className="text-[10px] opacity-50">|</span>
                <span className="text-xs opacity-75">
                  {company.fiscalDayOpen ? `Day ${company.currentFiscalDayNo || '?'}` : 'No Active Day'}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setIsEditing(true)}>
              Edit Configuration
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showConnectivityDialog} onOpenChange={setShowConnectivityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connectivity Test Results</DialogTitle>
            <DialogDescription> Diagnostic results for ZIMRA connection </DialogDescription>
          </DialogHeader>
          {connectivityResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <span className="font-medium text-slate-700">Overall Status</span>
                <Badge variant={connectivityResult.overallStatus === 'Online' ? 'default' : 'destructive'} className={connectivityResult.overallStatus === 'Online' ? 'bg-green-600' : ''}>
                  {connectivityResult.overallStatus.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2">
                {connectivityResult.checks.map((check: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                    {check.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-slate-900">{check.name}</p>
                      <p className="text-xs text-slate-500">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-400 text-center pt-2">
                Last Tested: {new Date(connectivityResult.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isRegistered && (
        <div className="pt-6 border-t space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Day Management
            </h4>
            <DayManagementControls company={company} variant="light" />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700">Maintenance</h4>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => renewCertificateMutation.mutate()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {renewCertificateMutation.isPending ? "Renewing..." : "Renew Certificate"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnectivityMutation.mutate()}
                disabled={testConnectivityMutation.isPending}
              >
                {testConnectivityMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4 mr-2" />
                )}
                Test Connectivity
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyTaxpayerMutation.mutate()}
                disabled={verifyTaxpayerMutation.isPending || !deviceSerialNo}
              >
                <Server className="w-4 h-4 mr-2" />
                {verifyTaxpayerMutation.isPending ? "Verifying..." : "Verify Taxpayer Info"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => syncConfigMutation.mutate()}
                disabled={syncConfigMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />

                Sync Tax Config
              </Button>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full border rounded-md">
            <AccordionItem value="danger_zone" className="border-none">
              <AccordionTrigger className="px-4 text-red-600 font-semibold hover:no-underline hover:bg-red-50 rounded-t-md">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Advanced Maintenance (Danger Zone)
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-slate-50 space-y-4">
                <p className="text-xs text-slate-500">
                  Manually reset critical device counters. <strong>Use with extreme caution</strong> - only when switching devices or fixing synchronization errors.
                </p>
                <AdvancedResetControls company={company} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
          previousHash: previousHash === "" ? "" : previousHash // Allow empty string to clear
        })
      });
      if (!res.ok) throw await res.json();
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Counters Reset", description: "Device configuration has been updated.", className: "bg-orange-100 text-orange-900" });
    },
    onError: (err: any) => {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div className="space-y-2">
        <Label className="text-xs">Global No (Last Used)</Label>
        <Input
          value={globalNumber}
          onChange={(e) => setGlobalNumber(e.target.value)}
          placeholder="0"
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Daily Count</Label>
        <Input
          value={dailyCounter}
          onChange={(e) => setDailyCounter(e.target.value)}
          placeholder="0"
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="space-y-2">
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => {
            if (confirm("Are you sure you want to manually overwrite these counters? This can break ZIMRA chain validation if incorrect.")) {
              resetMutation.mutate();
            }
          }}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? "Applying..." : "Apply Manual Reset"}
        </Button>
      </div>
      <div className="md:col-span-3 space-y-2">
        <Label className="text-xs">Previous Fiscal Hash (Optional)</Label>
        <Input
          value={previousHash}
          onChange={(e) => setPreviousHash(e.target.value)}
          placeholder="Leave empty to clear, or paste hash"
          className="h-8 text-xs font-mono"
        />
        <p className="text-[10px] text-slate-500">
          Only change this if you know the exact hash of the last successfully submitted receipt.
        </p>
      </div>
    </div>
  );
}
