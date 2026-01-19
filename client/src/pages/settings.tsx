import { Layout } from "@/components/layout";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Settings, Landmark, Save, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SettingsPage() {
  const { toast } = useToast();
  const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
  const storedCompanyId = isNaN(rawId) ? 0 : rawId;

  const { data: companies, isLoading } = useCompanies();
  const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
  const companyId = currentCompany?.id || 0;

  const updateCompany = useUpdateCompany(companyId);

  // Form State
  const [formData, setFormData] = useState<any>({});

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
        bankName: currentCompany.bankName || "",
        accountName: currentCompany.accountName || "",
        accountNumber: currentCompany.accountNumber || "",
        branchCode: currentCompany.branchCode || "",
        currency: currentCompany.currency || "USD",
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your company profile and preferences</p>
        </div>
        <Button onClick={() => handleSave("All settings")} disabled={updateCompany.isPending} className="btn-gradient shadow-lg">
          {updateCompany.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        {/* Company Profile */}
        <Card className="card-depth border-none h-fit">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Company Details
            </CardTitle>
            <CardDescription>Manage your business identity and contact info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Official Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Trading Name</Label>
                <Input
                  value={formData.tradingName}
                  onChange={e => setFormData({ ...formData, tradingName: e.target.value })}
                  placeholder="DBA (Optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@business.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+263..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business Way"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Harare"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Details */}
        <Card className="card-depth border-none h-fit">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Landmark className="w-5 h-5 mr-2 text-emerald-600" />
              Banking Details
            </CardTitle>
            <CardDescription>Configure default payment information for invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="e.g. Stanbic, CBZ, Ecocash"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={formData.accountName}
                onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="Beneficiary Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={formData.accountNumber}
                  onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Account #"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input
                  value={formData.branchCode}
                  onChange={e => setFormData({ ...formData, branchCode: e.target.value })}
                  placeholder="Sort Code"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Compliance */}
        <Card className="card-depth border-none h-fit">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-slate-600" />
              Tax & Compliance
            </CardTitle>
            <CardDescription>ZIMRA registered identifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TIN</Label>
                <Input
                  value={formData.tin}
                  onChange={e => setFormData({ ...formData, tin: e.target.value })}
                  placeholder="Tax ID Number"
                />
              </div>
              <div className="space-y-2">
                <Label>BP Number</Label>
                <Input
                  value={formData.bpNumber}
                  onChange={e => setFormData({ ...formData, bpNumber: e.target.value })}
                  placeholder="Business Partner Number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>VAT Number</Label>
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
              <label
                htmlFor="vatEnabled"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Apply VAT to invoices by default
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Logo Management */}
        <Card className="card-depth border-none h-fit">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2 text-indigo-600" />
              Company Logo
            </CardTitle>
            <CardDescription>Upload your brand logo for invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50">
              {currentCompany.logoUrl ? (
                <div className="relative group">
                  <img
                    src={currentCompany.logoUrl}
                    alt="Company Logo"
                    className="h-32 w-auto object-contain rounded-lg shadow-md mb-4"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <p className="text-white text-xs font-medium">Click below to change</p>
                  </div>
                </div>
              ) : (
                <div className="h-32 w-32 bg-slate-100 rounded-lg flex items-center justify-center mb-4 border border-slate-200">
                  <ImageIcon className="w-12 h-12 text-slate-300" />
                </div>
              )}

              <div className="w-full max-w-xs">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append("logo", file);

                    try {
                      const res = await fetch(`/api/companies/${companyId}/logo`, {
                        method: "POST",
                        body: formData,
                        // Auth is handled by cookies
                      });

                      if (!res.ok) throw new Error("Upload failed");

                      const data = await res.json();
                      toast({
                        title: "Success",
                        description: "Logo updated successfully",
                      });

                      // Invalidate company query
                      window.location.reload(); // Simple way to refresh for now
                    } catch (err: any) {
                      toast({
                        title: "Error",
                        description: err.message || "Failed to upload logo",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  PNG, JPG or WebP. Max 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Preferences */}
        <Card className="card-depth border-none h-fit">
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
              Regional Settings
            </CardTitle>
            <CardDescription>System preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Input
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USD"
              />
            </div>
            <div className="space-y-2 opacity-50">
              <Label>Date Format</Label>
              <Input value="DD/MM/YYYY" disabled className="bg-slate-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
