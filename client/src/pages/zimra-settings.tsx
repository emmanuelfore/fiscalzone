import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Settings, Server, CheckCircle2, AlertTriangle, RefreshCw, Activity, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ZimraSettingsPage() {
  const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
  const storedCompanyId = isNaN(rawId) ? 0 : rawId;

  const { data: companies, isLoading } = useCompanies();
  const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
  const companyId = currentCompany?.id || 0;

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

function ZimraDeviceConfig({ company }: { company: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState(company.fdmsDeviceId || "");
  const [activationKey, setActivationKey] = useState(company.fdmsApiKey || "");
  const [deviceSerialNo, setDeviceSerialNo] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [connectivityResult, setConnectivityResult] = useState<any>(null);
  const [showConnectivityDialog, setShowConnectivityDialog] = useState(false);

  // Error Recovery State
  const [errorRecovery, setErrorRecovery] = useState<any>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const isRegistered = !!company.fdmsDeviceId && !!company.zimraCertificate;

  // Verify Taxpayer
  const verifyTaxpayerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/verify-taxpayer`, {
        method: "POST",
        body: JSON.stringify({ deviceId, activationKey, deviceSerialNo })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Verification failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      toast({ title: "Taxpayer Verified", description: `Name: ${data.taxPayerName}, TIN: ${data.taxPayerTIN}` });
    },
    onError: (err: Error) => {
      toast({ title: "Verification Error", description: err.message, variant: "destructive" });
    }
  });

  // Save & Register
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to save configuration");
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate company query
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    }
  });

  const registerDeviceMutation = useMutation({
    mutationFn: async () => {
      // 1. Initial Device Registration (First Time)
      // Calls public registration endpoint to get certificate
      const res = await apiFetch(`/api/companies/${company.id}/zimra/register`, {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          activationKey,
          deviceSerialNo
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Device Registered Successfully!", className: "bg-green-100 text-green-900" });
    },
    onError: (err: Error) => {
      toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
    }
  });

  const renewCertificateMutation = useMutation({
    mutationFn: async () => {
      // 2. Issue/Renew Certificate (Requires existing certificate for mTLS)
      const res = await apiFetch(`/api/companies/${company.id}/zimra/issue-certificate`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Renewal failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Certificate Renewed Successfully!", className: "bg-green-100 text-green-900" });
    },
    onError: (err: Error) => {
      toast({ title: "Renewal Failed", description: err.message, variant: "destructive" });
    }
  });


  // Revised Close Day Mutation with support for structured errors
  const closeDayEnhanced = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/day/close`, {
        method: "POST"
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw errorData; // Throwing the whole object
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["zimraStatus", company.id] });
      toast({ title: "Fiscal Day Closed", description: `Operation ID: ${data.operationID || 'N/A'}`, className: "bg-green-100 text-green-900" });
    },
    onError: (err: any) => {
      if (err.recovery) {
        setErrorRecovery(err);
        setShowErrorDialog(true);
      } else {
        toast({
          title: "Close Day Failed",
          description: err.message || "Unknown error occurred",
          variant: "destructive"
        });
      }
    }
  });

  // Sync Config
  const syncConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/config/sync`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to sync configuration");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Configuration Synced", description: `Updated ${data.taxLevels.length} tax levels.`, className: "bg-green-100 text-green-900" });
    },
    onError: (err: Error) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
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
      toast({
        title: "Environment Switched",
        description: `Now using ZIMRA ${data.environment.toUpperCase()} endpoint.`,
        className: "bg-blue-600 text-white"
      });
    },
    onError: (err: Error) => {
      toast({ title: "Switch Failed", description: err.message, variant: "destructive" });
    }
  });

  // Connectivity Test
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

  // Auto-Test Connectivity on Mount if registered
  useState(() => {
    if (isRegistered) {
      testConnectivityMutation.mutate();
    }
  }); // Run once on mount (useState lazy init trick or use useEffect) - Actually useEffect is better

  useEffect(() => {
    if (isRegistered) {
      testConnectivityMutation.mutate();
    }
  }, []); // Empty dependency array = mount only

  // Live Status Query
  const zimraStatusQuery = useQuery({
    queryKey: ["zimraStatus", company.id],
    queryFn: async () => {
      if (!isRegistered) return null;
      const res = await apiFetch(`/api/companies/${company.id}/zimra/status`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: isRegistered
  });

  const isOnline = testConnectivityMutation.data?.overallStatus === 'Online';

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
            if (confirm("⚠️ CAUTION: You are about to switch to the ZIMRA PRODUCTION environment. Real fiscal data will be submitted. Are you sure?")) {
              switchEnvironmentMutation.mutate('production');
            }
          }}
          disabled={switchEnvironmentMutation.isPending || company.zimraEnvironment === 'production'}
        >
          PRODUCTION
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Device ID</Label>
          <Input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="1234567890"
            disabled={isRegistered}
          />
        </div>
        <div className="space-y-2">
          <Label>Activation Key</Label>
          <Input
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            type="password"
            placeholder="xxxxxxxx"
            disabled={isRegistered}
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
        {!isRegistered ? (
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
              {registerDeviceMutation.isPending ? "Registering..." : "2. Register Device"}
            </Button>
          </>
        ) : (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md w-full border ${isOnline ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
            {testConnectivityMutation.isPending ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            ) : isOnline ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {testConnectivityMutation.isPending ? "Checking Connectivity..." : (isOnline ? 'Online & Registered' : 'Offline / Connection Failed')}
              </span>
              <span className="text-xs opacity-75">
                {/* Show Day from Live Query if available, else Company */}
                {zimraStatusQuery.data?.lastFiscalDayNo
                  ? `Day ${zimraStatusQuery.data.lastFiscalDayNo}`
                  : (company.currentFiscalDayNo ? `Day ${company.currentFiscalDayNo}` : 'No Active Day')}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setDeviceId("") /* Reset for edit */}>
              Re-configure
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

      {/* Error Recovery Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-lg border-2 border-red-100">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="w-6 h-6" />
              <DialogTitle>Fiscal Day Closure Failed</DialogTitle>
            </div>
            <DialogDescription className="font-medium text-slate-700">
              {errorRecovery?.message}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded text-xs font-mono border text-slate-600">
              {errorRecovery?.lastError && <p className="mb-1"><strong>Error:</strong> {errorRecovery.lastError}</p>}
              {errorRecovery?.zimraErrorCode && <p><strong>Code:</strong> {errorRecovery.zimraErrorCode}</p>}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Suggested Recovery Actions:</h4>
              <ul className="space-y-2">
                {errorRecovery?.recovery?.options?.map((option: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    {option}
                  </li>
                ))}
              </ul>
            </div>

            {errorRecovery?.recovery?.manualClosureUrl && (
              <div className="pt-2">
                <a
                  href={errorRecovery.recovery.manualClosureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                >
                  Open ZIMRA Public Portal <RefreshCw className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>Dismiss</Button>
            <Button variant="default" onClick={() => { setShowErrorDialog(false); closeDayEnhanced.mutate(); }}>Retry Closure</Button>
          </div>
        </DialogContent>
      </Dialog>


      {
        isRegistered && (
          <div className="pt-6 border-t space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-slate-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Day Management
              </h4>
              <div className="bg-slate-50 p-4 rounded-md border flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Current Fiscal Day</p>
                  <p className="text-xl font-bold">
                    {zimraStatusQuery.data?.lastFiscalDayNo || company.currentFiscalDayNo || "N/A"}
                  </p>
                  <div className="flex items-center gap-2">
                    {zimraStatusQuery.isLoading && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                    <p className={`text-xs font-medium ${(zimraStatusQuery.data?.fiscalDayStatus === 'FiscalDayOpened' || (!zimraStatusQuery.data && company.fiscalDayOpen))
                      ? "text-green-600"
                      : "text-amber-600"
                      }`}>
                      {(zimraStatusQuery.data?.fiscalDayStatus === 'FiscalDayOpened' || (!zimraStatusQuery.data && company.fiscalDayOpen))
                        ? "Status: OPEN"
                        : "Status: CLOSED"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={(zimraStatusQuery.data?.fiscalDayStatus === 'FiscalDayOpened' || (!zimraStatusQuery.data && company.fiscalDayOpen)) ? "destructive" : "secondary"}
                  onClick={() => closeDayEnhanced.mutate()}
                  disabled={
                    zimraStatusQuery.isLoading ||
                    (zimraStatusQuery.data && zimraStatusQuery.data.fiscalDayStatus !== 'FiscalDayOpened') ||
                    (!zimraStatusQuery.data && !company.fiscalDayOpen) ||
                    closeDayEnhanced.isPending
                  }
                >
                  {closeDayEnhanced.isPending ? "Closing..." : "Close Fiscal Day"}
                </Button>
              </div>
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
          </div>
        )
      }
    </div >
  );
}
