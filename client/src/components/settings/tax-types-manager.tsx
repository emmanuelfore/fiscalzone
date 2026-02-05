import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Edit2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaxType {
    id: number;
    name: string;
    code: string;
    rate: string;
    zimraTaxId?: string;
    description?: string;
    isActive: boolean;
}

export function TaxTypesManager({ companyId }: { companyId: number }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTax, setEditingTax] = useState<TaxType | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        rate: "0",
        zimraTaxId: "3", // Default Standard
        description: ""
    });

    const { data: taxTypes, isLoading } = useQuery({
        queryKey: ["tax-types", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/tax-types?companyId=${companyId}`);
            if (!res.ok) throw new Error("Failed to fetch tax types");
            return res.json() as Promise<TaxType[]>;
        },
        enabled: !!companyId
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiFetch("/api/tax-types", {
                method: "POST",
                body: JSON.stringify({ ...data, companyId })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create tax type");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tax-types", companyId] });
            setIsDialogOpen(false);
            toast({ title: "Tax Type Created", description: "New tax rate added successfully." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiFetch(`/api/tax-types/${editingTax?.id}`, {
                method: "PUT",
                body: JSON.stringify({ ...data, companyId })
            });
            if (!res.ok) throw new Error("Failed to update tax type");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tax-types", companyId] });
            setIsDialogOpen(false);
            setEditingTax(null);
            toast({ title: "Tax Type Updated", description: "Changes saved successfully." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    const handleSubmit = () => {
        const payload = {
            ...formData,
            rate: parseFloat(formData.rate),
            effectiveFrom: new Date().toISOString().split('T')[0] // simplified
        };

        if (editingTax) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const openCreate = () => {
        setEditingTax(null);
        setFormData({ name: "", code: "", rate: "0", zimraTaxId: "3", description: "" });
        setIsDialogOpen(true);
    };

    const openEdit = (tax: TaxType) => {
        setEditingTax(tax);
        setFormData({
            name: tax.name,
            code: tax.code,
            rate: tax.rate.toString(),
            zimraTaxId: tax.zimraTaxId || "3",
            description: tax.description || ""
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="hidden">
                {/* Trigger for parent button to click */}
                <button id="add-tax-trigger" onClick={openCreate}>Add</button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Rate (%)</TableHead>
                        <TableHead>ZIMRA ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                    ) : taxTypes?.map((tax) => (
                        <TableRow key={tax.id}>
                            <TableCell className="font-medium">{tax.name}</TableCell>
                            <TableCell>{tax.rate}%</TableCell>
                            <TableCell>
                                {tax.zimraTaxId === "1" && <span className="bg-slate-100 px-2 py-1 rounded text-xs">Exempt (1)</span>}
                                {tax.zimraTaxId === "2" && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">Zero Rated (2)</span>}
                                {tax.zimraTaxId === "3" && <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs">Standard (3)</span>}
                                {!["1", "2", "3"].includes(tax.zimraTaxId || "") && <span className="text-slate-400 text-xs">{tax.zimraTaxId || "-"}</span>}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(tax)}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTax ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
                        <DialogDescription>
                            Configure tax details and ZIMRA mapping.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Code</Label>
                            <Input
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="col-span-3"
                                placeholder="VAT-STD"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Rate (%)</Label>
                            <Input
                                type="number"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">ZIMRA ID</Label>
                            <Select
                                value={formData.zimraTaxId}
                                onValueChange={(val) => setFormData({ ...formData, zimraTaxId: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select ZIMRA Tax ID" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 - Exempt</SelectItem>
                                    <SelectItem value="2">2 - Zero Rated</SelectItem>
                                    <SelectItem value="3">3 - Standard (VAT)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                            {editingTax ? "Save Changes" : "Create Tax"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
