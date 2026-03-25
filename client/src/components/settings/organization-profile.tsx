import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Upload, Image as ImageIcon, MapPin, Globe, Mail, Phone, RefreshCw, Coins } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useUpdateCompany } from "@/hooks/use-companies";

interface OrganizationProfileProps {
  company: any;
  formData: any;
  setFormData: (data: any) => void;
}

export function OrganizationProfile({ company, formData, setFormData }: OrganizationProfileProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const updateCompany = useUpdateCompany(company.id);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      toast({ title: "Success", description: "Logo updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Company Profile</h2>
        <p className="text-sm text-slate-500">Official business identification and contact details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="space-y-8">
          <Card className="card-depth border-none">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Identity & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal Company Name</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Official Registered Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Trading Name (DBA)</Label>
                  <Input
                    value={formData.tradingName || ""}
                    onChange={e => setFormData({ ...formData, tradingName: e.target.value })}
                    placeholder="Doing Business As"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Branch Name (Used for ZIMRA [5])</Label>
                  <Input
                    value={formData.branchName || ""}
                    onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="e.g. Harare North Branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Business Email
                  </Label>
                  <Input
                    value={formData.email || ""}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Contact Phone
                  </Label>
                  <Input
                    value={formData.phone || ""}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+263..."
                  />
                </div>
              </div>

               <div className="space-y-2 pt-4 border-t border-slate-50">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Street Address
                </Label>
                <Input
                  value={formData.address || ""}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Business Way"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">City</Label>
                  <Input
                    value={formData.city || ""}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Harare"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Website
                  </Label>
                  <Input
                    value={formData.website || ""}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-depth border-none">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Coins className="w-5 h-5 mr-2 text-amber-600" />
                Regional Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Currency</Label>
                  <Input
                    value={formData.currency || "USD"}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="USD"
                  />
                </div>
                <div className="space-y-2 opacity-50">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date Format</Label>
                  <Input value="DD/MM/YYYY" disabled className="bg-slate-50" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="card-depth border-none overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base">Company Logo</CardTitle>
              <CardDescription>Displayed on invoices and POS</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-100/30 group hover:border-indigo-400 transition-all duration-300">
                {company.logoUrl ? (
                  <div className="relative mb-6">
                    <img src={company.logoUrl} alt="Logo" className="h-32 w-32 object-contain rounded-2xl shadow-xl bg-white p-2" />
                  </div>
                ) : (
                  <div className="h-32 w-32 bg-white rounded-2xl flex items-center justify-center mb-6 border border-slate-100 shadow-xl">
                    <ImageIcon className="w-12 h-12 text-slate-200" />
                  </div>
                )}
                <div className="w-full">
                  <Label htmlFor="logo-upload" className="block text-center cursor-pointer bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                    {isUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" /> Change Logo
                      </span>
                    )}
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleLogoUpload}
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-3 uppercase tracking-tighter">Recommended: Square PNG/SVG at least 400x400px</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
