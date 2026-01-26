import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Settings, Landmark, Save, RefreshCw, Upload, Image as ImageIcon, ShieldCheck, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useActiveCompany } from "@/hooks/use-active-company";

export default function SettingsPage() {
  const { toast } = useToast();
  const { activeCompany, isLoading: isLoadingActive } = useActiveCompany();
  const currentCompany = activeCompany;
  const companyId = currentCompany?.id || 0;
  const isLoading = isLoadingActive;

  const updateCompany = useUpdateCompany(companyId);
  const queryClient = useQueryClient();

  const { mutate: syncZimra, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${companyId}/zimra/config/sync`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to sync ZIMRA configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Successful",
        description: "ZIMRA configuration and tax levels updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: (err: any) => {
      toast({
        title: "Sync Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      setFormData({
        name: currentCompany.name || "",
        tradingName: currentCompany.tradingName || "",
        email: currentCompany.email || "",
        phone: currentCompany.phone || "",
        address: currentCompany.address || "",
        city: currentCompany.city || "",
        website: currentCompany.website || "",
        tin: currentCompany.tin || "",
        vatNumber: currentCompany.vatNumber || "",
        bpNumber: currentCompany.bpNumber || "",
        vatEnabled: currentCompany.vatEnabled ?? true,
        vatRegistered: currentCompany.vatRegistered ?? true,
        bankName: currentCompany.bankName || "",
        accountName: currentCompany.accountName || "",
        accountNumber: currentCompany.accountNumber || "",
        branchCode: currentCompany.branchCode || "",
        currency: currentCompany.currency || "USD",
        branchName: currentCompany.branchName || "",
        emailSettings: currentCompany.emailSettings || {
          provider: 'resend',
          apiKey: '',
          fromEmail: 'billing@yourdomain.com',
          fromName: currentCompany.name || 'Accounts'
        }
      });
    }
  }, [currentCompany]);

  const handleSave = async (section: string) => {
    try {
      await updateCompany.mutateAsync(formData);
      toast({
        title: "Success",
        description: `${section} updated successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <Layout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin w-8 h-8 text-slate-300" /></div></Layout>;
  if (!currentCompany) return <Layout><div className="p-8">No company details available.</div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your company profile and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 border border-slate-200 shadow-sm">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">General</TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Finance & Tax</TabsTrigger>
          <TabsTrigger value="communication" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Communication</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Security</TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-slate-800">General Settings</h2>
            <Button onClick={() => handleSave("Company profile")} disabled={updateCompany.isPending} size="sm" className="btn-gradient shadow-md">
              <Save className="mr-2 h-4 w-4" /> Save General
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="card-depth border-none h-fit">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  Company Details
                </CardTitle>
                <CardDescription>Official business identification and contacts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Company Name</Label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Official Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Trading Name</Label>
                    <Input
                      value={formData.tradingName}
                      onChange={e => setFormData({ ...formData, tradingName: e.target.value })}
                      placeholder="DBA (Optional)"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Branch Name (ZIMRA [5])</Label>
                  <Input
                    value={formData.branchName}
                    onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="Only if different from Company Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@business.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+263..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Street Address</Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Business Way"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Harare"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Website</Label>
                    <Input
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="card-depth border-none h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Upload className="w-5 h-5 mr-2 text-indigo-600" />
                    Company Logo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50">
                    {currentCompany.logoUrl ? (
                      <div className="relative group mb-4">
                        <img src={currentCompany.logoUrl} alt="Logo" className="h-24 w-auto object-contain rounded shadow-sm" />
                      </div>
                    ) : (
                      <div className="h-24 w-24 bg-slate-100 rounded flex items-center justify-center mb-4 border border-slate-200">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="w-full">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append("file", file);
                            const res = await apiFetch("/api/upload", { method: "POST", body: fd });
                            if (!res.ok) throw new Error("Upload failed");
                            const data = await res.json();
                            await updateCompany.mutateAsync({ logoUrl: data.url });
                            toast({ title: "Success", description: "Logo updated" });
                          } catch (err: any) {
                            toast({ title: "Error", description: err.message, variant: "destructive" });
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                        className="text-xs cursor-pointer"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-depth border-none h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
                    Regional Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Default Currency</Label>
                    <Input
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      placeholder="USD"
                    />
                  </div>
                  <div className="space-y-1 opacity-50">
                    <Label className="text-xs">Date Format</Label>
                    <Input value="DD/MM/YYYY" disabled className="bg-slate-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* FINANCE TAB */}
        <TabsContent value="finance" className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Finance & Tax</h2>
            <Button onClick={() => handleSave("Financial details")} disabled={updateCompany.isPending} size="sm" className="btn-gradient shadow-md">
              <Save className="mr-2 h-4 w-4" /> Save Finance Settings
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="card-depth border-none h-fit">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Landmark className="w-5 h-5 mr-2 text-emerald-600" />
                  Banking Details
                </CardTitle>
                <CardDescription>Default payment info for invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-base font-bold text-slate-800 block">Bank Name</Label>
                  <Input
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g. Stanbic, CBZ, Ecocash"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-bold text-slate-800 block">Account Name</Label>
                  <Input
                    value={formData.accountName}
                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Beneficiary Name"
                    className="h-12 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-slate-800 block">Account Number</Label>
                    <Input
                      value={formData.accountNumber}
                      onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="Account #"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-slate-800 block">Branch Code</Label>
                    <Input
                      value={formData.branchCode}
                      onChange={e => setFormData({ ...formData, branchCode: e.target.value })}
                      placeholder="Sort Code"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-depth border-none h-fit">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Settings className="w-5 h-5 mr-2 text-slate-600" />
                  Tax & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">TIN</Label>
                    <Input
                      value={formData.tin}
                      onChange={e => setFormData({ ...formData, tin: e.target.value })}
                      placeholder="Tax ID Number"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">BP Number</Label>
                    <Input
                      value={formData.bpNumber}
                      onChange={e => setFormData({ ...formData, bpNumber: e.target.value })}
                      placeholder="Business Partner Number"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">VAT Number</Label>
                  <Input
                    value={formData.vatNumber}
                    onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="VAT Reg #"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="vatEnabled"
                    checked={formData.vatEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, vatEnabled: checked === true })}
                  />
                  <label htmlFor="vatEnabled" className="text-sm font-medium">Apply VAT by default</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vatRegistered"
                    checked={formData.vatRegistered}
                    onCheckedChange={(checked) => setFormData({ ...formData, vatRegistered: checked === true })}
                  />
                  <label htmlFor="vatRegistered" className="text-sm font-medium">Company is VAT registered</label>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-slate-700">ZIMRA Sync</Label>
                    <p className="text-[10px] text-slate-500">Update rates and config from gateway</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncZimra()}
                    disabled={isSyncing}
                    className="h-8"
                  >
                    {isSyncing ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-2" />}
                    Sync Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COMMUNICATION TAB */}
        <TabsContent value="communication" className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Email Configuration</h2>
            <Button onClick={() => handleSave("Email settings")} disabled={updateCompany.isPending} size="sm" className="btn-gradient shadow-md">
              <Save className="mr-2 h-4 w-4" /> Save Communication
            </Button>
          </div>

          <Card className="card-depth border-none max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Mail className="w-5 h-5 mr-2 text-violet-600" />
                Resend API Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">API Key</Label>
                <Input
                  type="password"
                  value={formData.emailSettings?.apiKey || ""}
                  onChange={e => setFormData({
                    ...formData,
                    emailSettings: { ...formData.emailSettings, apiKey: e.target.value }
                  })}
                  placeholder="re_..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">From Name</Label>
                  <Input
                    value={formData.emailSettings?.fromName || ""}
                    onChange={e => setFormData({
                      ...formData,
                      emailSettings: { ...formData.emailSettings, fromName: e.target.value }
                    })}
                    placeholder="e.g. Accounts Team"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">From Email</Label>
                  <Input
                    value={formData.emailSettings?.fromEmail || ""}
                    onChange={e => setFormData({
                      ...formData,
                      emailSettings: { ...formData.emailSettings, fromEmail: e.target.value }
                    })}
                    placeholder="billing@..."
                  />
                </div>
              </div>
              <div className="bg-amber-50 p-3 rounded border border-amber-100 text-[11px] text-amber-800 italic">
                <strong>Note:</strong> Verify your domain in Resend. For testing, use <code>onboarding@resend.dev</code>.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Security & Privacy</h2>
          <Card className="card-depth border-none max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <ShieldCheck className="w-5 h-5 mr-2 text-red-600" />
                Audit System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                Track all critical actions performed by team members within your organization.
              </p>
              <Link href="/audit-logs">
                <Button variant="outline" className="w-full">
                  Access Audit Logs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

