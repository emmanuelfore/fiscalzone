
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Calendar, Tag, Box, AlertCircle, Loader2, Layers, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Props {
    productId: number;
    companyId: number;
}

export function BatchVariationManager({ productId, companyId }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("variations");

    // Dialog States
    const [isVariationDialogOpen, setIsVariationDialogOpen] = useState(false);
    const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

    // Form States
    const [newVariation, setNewVariation] = useState({ name: "", price: "", sku: "" });
    const [newBatch, setNewBatch] = useState({ 
        batchNumber: "", 
        expiryDate: new Date().toISOString().split('T')[0], 
        stockLevel: "",
        variationId: "none"
    });

    // Fetch Variations
    const { data: variations, isLoading: isLoadingVariations } = useQuery<any[]>({
        queryKey: ["product-variations", productId],
        queryFn: async () => {
            const res = await apiFetch(`/api/products/${productId}/variations`);
            return res.json();
        }
    });

    // Fetch Batches
    const { data: batches, isLoading: isLoadingBatches } = useQuery<any[]>({
        queryKey: ["product-batches", productId],
        queryFn: async () => {
            const res = await apiFetch(`/api/products/${productId}/batches`);
            return res.json();
        }
    });

    // Mutations
    const createVariationMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiFetch(`/api/products/${productId}/variations`, {
                method: "POST",
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to add format");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product-variations", productId] });
            toast({ title: "Format added successfully" });
            setIsVariationDialogOpen(false);
            setNewVariation({ name: "", price: "", sku: "" });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const createBatchMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = { ...data };
            if (payload.variationId === "none") delete payload.variationId;
            else payload.variationId = parseInt(payload.variationId);

            const res = await apiFetch(`/api/products/${productId}/batches`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to add batch");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product-batches", productId] });
            toast({ title: "Batch added successfully" });
            setIsBatchDialogOpen(false);
            setNewBatch({ 
                batchNumber: "", 
                expiryDate: new Date().toISOString().split('T')[0], 
                stockLevel: "",
                variationId: "none"
            });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleAddVariation = () => {
        if (!newVariation.name) return;
        createVariationMutation.mutate({ 
            productId, 
            name: newVariation.name, 
            price: newVariation.price || "0",
            sku: newVariation.sku || `${productId}-${newVariation.name.replace(/\s+/g, '-').toLowerCase()}`
        });
    };

    const handleAddBatch = () => {
        if (!newBatch.batchNumber) return;
        createBatchMutation.mutate({
            productId,
            ...newBatch
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 h-12">
                    <TabsTrigger value="variations" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Layers className="w-4 h-4 mr-2" />
                        Color/Size Formats
                    </TabsTrigger>
                    <TabsTrigger value="batches" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <History className="w-4 h-4 mr-2" />
                        Inventory Batches
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="variations" className="mt-6 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Product Formats</h3>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl font-bold gap-2"
                            onClick={() => setIsVariationDialogOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                            New Format
                        </Button>
                    </div>

                    <ScrollArea className="h-[300px] rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <div className="space-y-3">
                            {Array.isArray(variations) && variations.map((v) => (
                                <Card key={v.id} className="rounded-xl border-none shadow-sm group hover:shadow-md transition-all">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <Tag className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{v.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{v.sku}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs font-black text-indigo-600">${Number(v.price).toFixed(2)}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Base Price Override</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {Array.isArray(variations) && variations.length === 0 && (
                                <div className="text-center py-12 text-slate-400 font-medium italic">
                                    No custom formats (sizes/colors) defined.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="batches" className="mt-6 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Stock Batch Tracking</h3>
                        <Button 
                            className="btn-gradient rounded-xl font-black gap-2"
                            onClick={() => setIsBatchDialogOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Add Batch
                        </Button>
                    </div>

                    <ScrollArea className="h-[300px] rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <div className="space-y-3">
                            {Array.isArray(batches) && batches.map((b) => {
                                const isExpired = new Date(b.expiryDate) < new Date();
                                const isExpiringSoon = !isExpired && new Date(b.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                const variation = variations?.find(v => v.id === b.variationId);

                                return (
                                    <Card key={b.id} className="rounded-xl border-none shadow-sm group hover:shadow-md transition-all overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className={`h-1 w-full ${isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-green-500'}`} />
                                            <div className="p-4 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-slate-900">Batch #{b.batchNumber}</p>
                                                        {variation && <Badge variant="outline" className="text-[9px] h-4 border-slate-200 text-slate-500">{variation.name}</Badge>}
                                                        {isExpired && <Badge className="bg-red-500 text-[10px] h-4">EXPIRED</Badge>}
                                                        {isExpiringSoon && <Badge className="bg-amber-500 text-[10px] h-4">EXPIRING SOON</Badge>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Calendar className="w-3 h-3" />
                                                        <p className="text-[10px] font-bold uppercase tracking-tighter">Expires: {format(new Date(b.expiryDate), "MMM dd, yyyy")}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-slate-900">{Number(b.stockLevel).toFixed(0)} units</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Batch Stock</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            {Array.isArray(batches) && batches.length === 0 && (
                                <div className="text-center py-12 text-slate-400 font-medium italic">
                                    No inventory batches tracked for this product.
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                        <p className="text-[10px] text-orange-700 font-medium leading-relaxed">
                            Batches track expiration independently by default, but can be linked to Formats (Color/Size) if required. 
                            Inventory is managed using First-Expiry-First-Out (FEFO) strategy.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>

            {/* New Variation Dialog */}
            <Dialog open={isVariationDialogOpen} onOpenChange={setIsVariationDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-widest text-slate-900">Add Color/Size Format</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500 uppercase text-[10px] tracking-tight">
                            Define a new style or physical variant.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-500 ml-1">Format Name</Label>
                            <Input 
                                placeholder="e.g. Red, XL, 500ml" 
                                value={newVariation.name}
                                onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                                className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-500 ml-1">Price Override</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={newVariation.price}
                                    onChange={(e) => setNewVariation({ ...newVariation, price: e.target.value })}
                                    className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-500 ml-1">Internal SKU</Label>
                                <Input 
                                    placeholder="Auto-generated" 
                                    value={newVariation.sku}
                                    onChange={(e) => setNewVariation({ ...newVariation, sku: e.target.value })}
                                    className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            className="w-full btn-gradient rounded-xl font-black uppercase tracking-widest h-12"
                            onClick={handleAddVariation}
                            disabled={createVariationMutation.isPending || !newVariation.name}
                        >
                            {createVariationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Format"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Batch Dialog */}
            <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-widest text-slate-900">Track Inventory Batch</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500 uppercase text-[10px] tracking-tight">
                            Record stock arrival and expiry date.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-500 ml-1">Batch ID / No.</Label>
                                <Input 
                                    placeholder="e.g. B-001" 
                                    value={newBatch.batchNumber}
                                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                                    className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-500 ml-1">Arrival Quantity</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={newBatch.stockLevel}
                                    onChange={(e) => setNewBatch({ ...newBatch, stockLevel: e.target.value })}
                                    className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-500 ml-1">Expiration Date</Label>
                            <Input 
                                type="date" 
                                value={newBatch.expiryDate}
                                onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                                className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-500 ml-1">Format (Optional)</Label>
                            <Select 
                                value={newBatch.variationId} 
                                onValueChange={(val) => setNewBatch({ ...newBatch, variationId: val })}
                            >
                                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold">
                                    <SelectValue placeholder="General Stock (No specific format)" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="none">General Stock</SelectItem>
                                    {Array.isArray(variations) && variations.map(v => (
                                        <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            className="w-full btn-gradient rounded-xl font-black uppercase tracking-widest h-12"
                            onClick={handleAddBatch}
                            disabled={createBatchMutation.isPending || !newBatch.batchNumber}
                        >
                            {createBatchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Commit Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
