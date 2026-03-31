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

      <div className="max-w-5xl space-y-8">
        {/* Main Identity & Contact Section */}
        <Card className="card-depth border-none overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 p-8 pb-10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-2xl font-black text-slate-800 tracking-tight">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center mr-4 shadow-lg shadow-blue-200">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  Organization Identity
                </CardTitle>
                <CardDescription className="ml-14 text-sm font-medium text-slate-500 mt-1">Official business registration and regional parameters</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-12">
            {/* Row 1: Legal Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Legal Company Name</Label>
                <Input
                  value={formData.name || ""}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Official Registered Name"
                  className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Trading Name (DBA)</Label>
                <Input
                  value={formData.tradingName || ""}
                  onChange={e => setFormData({ ...formData, tradingName: e.target.value })}
                  placeholder="Doing Business As"
                  className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 2: Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Mail className="w-3 h-3 text-blue-500" /> Admin Email
                </Label>
                <Input
                  value={formData.email || ""}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@company.com"
                  className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Phone className="w-3 h-3 text-blue-500" /> Phone Contact
                </Label>
                <Input
                  value={formData.phone || ""}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+263..."
                  className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <Globe className="w-3 h-3 text-blue-500" /> Corporate Web
                </Label>
                <Input
                  value={formData.website || ""}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 3: Address & ZIMRA Branch */}
            <div className="pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-blue-500" /> Physical HQ Address
                </Label>
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    value={formData.address || ""}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street Address"
                    className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <Input
                    value={formData.city || ""}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City / Region"
                    className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                </div>
              </div>

               <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Branch Name (Fiscal ID)</Label>
                  <Input
                    value={formData.branchName || ""}
                    onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="e.g. Harare CBD / Bulawayo Hub"
                    className="h-12 rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Base Currency</Label>
                    <Input
                      value={formData.currency || "USD"}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      className="rounded-xl border-slate-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <Label className="text-[9px] font-bold text-slate-400 uppercase">System Timezone</Label>
                    <Input value="CAT (UTC+2)" disabled className="rounded-xl bg-slate-50 border-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding & Assets Section - Now Below Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="card-depth border-none overflow-hidden hover:shadow-xl transition-all duration-500">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 p-6">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  Corporate Logo
               </CardTitle>
               <CardDescription>Primary asset for receipt and invoice headers</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group/logo">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" className="h-40 w-40 object-contain rounded-3xl shadow-2xl bg-white p-4 border-2 border-slate-100 transition-transform group-hover/logo:scale-105" />
                  ) : (
                    <div className="h-40 w-40 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 transition-all group-hover/logo:border-indigo-300">
                      <ImageIcon className="w-16 h-16 text-slate-200" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your logo will be automatically formatted for thermal receipt printers and high-resolution PDF invoices. 
                      <span className="block mt-1 font-bold text-slate-700 underline">Vector SVG or High-Res PNG recommended.</span>
                    </p>
                  </div>
                  <div className="relative">
                    <Label htmlFor="logo-upload" className="flex items-center justify-center w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-4 text-sm font-bold transition-all shadow-lg shadow-blue-200">
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" /> Upload Brand Asset
                        </>
                      )}
                    </Label>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleLogoUpload} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-depth border-none overflow-hidden hover:shadow-xl transition-all duration-500">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 p-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="w-2 h-6 rounded-full" style={{ backgroundColor: formData.primaryColor || "#4f46e5" }} />
                Platform Theme
              </CardTitle>
              <CardDescription>Custom interface accent colors</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-6">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Color HexCode</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl shadow-inner border-2 border-white" 
                      style={{ backgroundColor: formData.primaryColor || "#4f46e5" }}
                    />
                    <Input 
                      value={formData.primaryColor || "#4f46e5"}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="font-mono font-bold text-slate-700 h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="pt-4">
                   <Input 
                    type="color" 
                    className="w-12 h-12 p-0 border-none bg-transparent cursor-pointer overflow-hidden rounded-full"
                    value={formData.primaryColor || "#4f46e5"}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl">
                 <p className="text-[10px] text-amber-800 font-medium leading-normal mb-0">
                  <span className="font-bold">PRO-TIP:</span> Using a darker primary color ensures that white text on buttons remains legible throughout the dashboard and POS interface.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
