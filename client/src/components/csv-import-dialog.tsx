import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileDown, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";

type ImportType = "customer" | "product" | "service";

interface CsvImportDialogProps {
    type: ImportType;
    companyId: number;
    onSuccess: () => void;
    trigger?: React.ReactNode;
}

export function CsvImportDialog({ type, companyId, onSuccess, trigger }: CsvImportDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

    const getTemplate = () => {
        if (type === "customer") {
            return "Name,Email,Phone,Address,TIN,VAT Number,Type\nJohn Doe,john@example.com,0771234567,123 Street,100100100,12345678,Individual\nACME Corp,info@acme.com,0242123456,Industrial Site,200200200,87654321,Business";
        }
        if (type === "product") {
            return "Name,Description,SKU,Price,Tax Rate,Type,Stock\nWidget A,High quality widget,WID-001,10.00,15.0,Good,100\nConsulting,Hourly rate,SVC-001,50.00,15.0,Service,0";
        }
        return "";
    };

    const handleDownloadTemplate = () => {
        const template = getTemplate();
        const blob = new Blob([template], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}_import_template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleImport = async () => {
        if (!file) return;

        setIsUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("companyId", companyId.toString());
        // Determine endpoint based on type
        // Service shares product endpoint but we might want to distinguish in future?
        // For now, services are products with type='service'. 
        // The endpoint `/api/import/products` handles discrimination via CSV column 'Type'.
        const endpoint = type === "customer" ? "/api/import/customers" : "/api/import/products";

        try {
            const res = await apiFetch(endpoint, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Import failed");
            }

            setResult({
                success: data.success,
                failed: data.failed,
                errors: data.errors
            });

            if (data.success > 0) {
                toast({
                    title: "Import Successful",
                    description: `Successfully imported ${data.success} ${type}s.`,
                });
                onSuccess();
            } else if (data.failed > 0) {
                toast({
                    title: "Import Finished with Errors",
                    description: `Failed to import ${data.failed} items. Check details.`,
                    variant: "destructive"
                });
            }

        } catch (error: any) {
            console.error("Import error:", error);
            toast({
                title: "Import Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setFile(null);
                setResult(null);
            }
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import {type === 'customer' ? 'Customers' : 'Products & Services'}</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import data.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step 1: Template */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700">1. Download Template</p>
                            <p className="text-xs text-slate-500">Use this format for your CSV file.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="text-primary hover:text-primary hover:bg-white text-xs h-8">
                            <FileDown className="w-3.5 h-3.5 mr-1.5" />
                            Download CSV
                        </Button>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">2. Upload CSV</p>
                        <div className="grid w-full items-center gap-1.5">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                disabled={isUploading}
                                className="cursor-pointer bg-white"
                            />
                            {file && (
                                <p className="text-xs text-slate-500">
                                    Selected: <span className="font-medium text-slate-700">{file.name}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    {result && (
                        <div className={cn("rounded-lg border p-4 text-sm space-y-2",
                            result.failed === 0 ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"
                        )}>
                            <div className="flex items-center gap-2 font-medium">
                                {result.failed === 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-orange-600" />}
                                <span>Import Complete</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="bg-white/50 p-2 rounded">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">Success</span>
                                    <p className="text-lg font-bold text-green-700">{result.success}</p>
                                </div>
                                <div className="bg-white/50 p-2 rounded">
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">Failed</span>
                                    <p className="text-lg font-bold text-red-700">{result.failed}</p>
                                </div>
                            </div>
                            {result.errors.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-orange-200/50">
                                    <p className="font-medium text-xs mb-1">Error Log:</p>
                                    <ul className="max-h-[100px] overflow-y-auto space-y-1 text-xs text-slate-600 list-disc pl-4">
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isUploading}>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import Data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
