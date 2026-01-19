import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Settings, Server, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">ZIMRA Device</h1>
        <p className="text-slate-500 mt-1">Manage your fiscal device configuration</p>
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
      // 1. Save Config First
      await updateCompanyMutation.mutateAsync({
        fdmsDeviceId: deviceId,
        fdmsApiKey: activationKey
      });

      // 2. Issue Certificate (Register/Renew)
      const res = await apiFetch(`/api/companies/${company.id}/zimra/issue-certificate`, {
        method: "POST"
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

  // Close Day
  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/zimra/day/close`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to close day");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Fiscal Day Closed", description: `Operation ID: ${data.operationID}`, className: "bg-green-100 text-green-900" });
    },
    onError: (err: Error) => {
      toast({ title: "Close Day Failed", description: err.message, variant: "destructive" });
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
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-md w-full">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Device Registered & Active</span>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setDeviceId("") /* Reset for edit */}>
              Re-configure
            </Button>
          </div>
        )}
      </div>

      {isRegistered && (
        <div className="pt-6 border-t space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Day Management
            </h4>
            <div className="bg-slate-50 p-4 rounded-md border flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Current Fiscal Day</p>
                <p className="text-xl font-bold">{company.currentFiscalDayNo || "N/A"}</p>
                <p className={`text-xs font-medium ${company.fiscalDayOpen ? "text-green-600" : "text-amber-600"}`}>
                  {company.fiscalDayOpen ? "Status: OPEN" : "Status: CLOSED"}
                </p>
              </div>
              <Button
                variant={company.fiscalDayOpen ? "destructive" : "secondary"}
                onClick={() => closeDayMutation.mutate()}
                disabled={!company.fiscalDayOpen || closeDayMutation.isPending}
              >
                {closeDayMutation.isPending ? "Closing..." : "Close Fiscal Day"}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700">Maintenance</h4>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => registerDeviceMutation.mutate()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Renew Certificate
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
      )}
    </div>
  );
}
