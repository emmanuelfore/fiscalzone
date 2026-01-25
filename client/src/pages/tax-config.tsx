
import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { useProducts } from "@/hooks/use-products";
import { useTaxConfig } from "@/hooks/use-tax-config";

import { ManageTaxTypeDialog } from "@/components/settings/manage-tax-type-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Calculator, FileText, Smartphone, Pencil } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

export default function TaxConfigPage() {
    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;

    const { data: companies, isLoading: isLoadingCompanies } = useCompanies();

    // Robust selection: Try storage ID, otherwise fallback to first available company
    const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = currentCompany?.id || 0;

    const { data: products } = useProducts(companyId);
    const { taxTypes, taxCategories } = useTaxConfig();

    if (isLoadingCompanies) return <Layout><div className="p-8">Loading companies...</div></Layout>;
    if (!currentCompany) return <Layout><div className="p-8">No company found. Please create one.</div></Layout>;

    // Helper to get category name
    const getCategoryName = (catId: number) => {
        if (!taxCategories.data) return "—";
        const cat = taxCategories.data.find((c: any) => c.id === catId);
        return cat ? cat.name : "—";
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Tax Configuration</h1>
                <p className="text-slate-500 mt-1">Manage ZIMRA Fiscalization and Tax Categories</p>
                {!currentCompany.vatRegistered && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <Calculator className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-900">Non-VAT Registered Company</p>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                Your company is currently marked as <strong>not registered for VAT</strong>.
                                VAT will be automatically disabled (set to 0%) for all invoices to ensure compliance with ZIMRA regulations for non-VAT taxpayers.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: ZIMRA Settings */}
                <div className="lg:col-span-1 space-y-8">
                    <Card className="card-depth border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center text-emerald-700">
                                <ShieldCheck className="w-5 h-5 mr-2" />
                                Fiscal Connection
                            </CardTitle>
                            <CardDescription>ZIMRA FDMS Configuration</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form
                                id="zimra-form"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const data = {
                                        tin: formData.get("tin") as string,
                                        fdmsDeviceId: formData.get("fdmsDeviceId") as string,
                                    };
                                    try {
                                        const res = await apiFetch(`/api/companies/${companyId}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(data)
                                        });
                                        if (res.ok) {
                                            alert("ZIMRA settings updated.");
                                            window.location.reload();
                                        } else {
                                            alert("Failed to update settings");
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert("Error saving settings");
                                    }
                                }}
                            >
                                <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg border border-emerald-100 flex items-center mb-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                    <span>Fiscal Device Online</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>TIN (Taxpayer ID)</Label>
                                        <Input name="tin" defaultValue={currentCompany.tin || ""} className="font-mono bg-white" placeholder="2000000000" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Fiscal Device ID</Label>
                                        <Input name="fdmsDeviceId" defaultValue={currentCompany.fdmsDeviceId || ""} className="font-mono bg-white" placeholder="HTML-12345" />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
                                    Save ZIMRA Settings
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="card-depth border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center text-slate-700">
                                <FileText className="w-5 h-5 mr-2" />
                                Invoice Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label>Template Style</Label>
                                <Select defaultValue="standard">
                                    <SelectTrigger className="bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard ZIMRA</SelectItem>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="modern">Modern</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Tax Categories & Mapping */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Tax Types / Rates Configuration */}
                    <Card className="card-depth border-none">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="flex items-center text-blue-700">
                                        <Calculator className="w-5 h-5 mr-2" />
                                        Tax Rates & ZIMRA Types
                                    </CardTitle>
                                    <CardDescription>Manage master tax rates used by categories</CardDescription>
                                </div>
                                <ManageTaxTypeDialog />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-3 font-medium text-slate-500">Name</th>
                                            <th className="p-3 font-medium text-slate-500">Code</th>
                                            <th className="p-3 font-medium text-slate-500">ID</th>
                                            <th className="p-3 font-medium text-slate-500 text-right">Rate</th>
                                            <th className="p-3 font-medium text-slate-500">Valid From</th>
                                            <th className="p-3 font-medium w-[50px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {taxTypes.data?.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-900">
                                                    {t.name}
                                                    <div className="text-xs text-slate-500 font-normal">{t.description}</div>
                                                </td>
                                                <td className="p-3 text-slate-700 font-mono">{t.zimraCode}</td>
                                                <td className="p-3 text-slate-700 font-mono">
                                                    {t.zimraTaxId || '—'}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-900">{t.rate}%</td>
                                                <td className="p-3 text-slate-500 text-xs">
                                                    {new Date(t.effectiveFrom).toLocaleDateString()}
                                                    {t.effectiveTo && ` - ${new Date(t.effectiveTo).toLocaleDateString()}`}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <ManageTaxTypeDialog
                                                        taxType={t}
                                                        trigger={
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <Pencil className="w-4 h-4 text-slate-500" />
                                                            </Button>
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>




                </div>
            </div>
        </Layout>
    );
}
