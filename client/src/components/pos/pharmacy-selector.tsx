
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Tag, Box, AlertCircle, ShoppingBag, Pill, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Batch {
    id: number;
    batchNumber: string;
    expiryDate: string;
    stockLevel: number;
}

interface Variation {
    id: number;
    name: string;
    price: number;
    stockLevel: number;
}

interface Props {
    product: any;
    open: boolean;
    onClose: () => void;
    onSelect: (data: { variation?: Variation, batch?: Batch }) => void;
}

export function PharmacySelector({ product, open, onClose, onSelect }: Props) {
    const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

    const { data: variations, isLoading: isLoadingVariations } = useQuery<Variation[]>({
        queryKey: ["active-variations", product?.id],
        queryFn: async () => {
            const res = await apiFetch(`/api/products/${product.id}/variations`);
            return res.json();
        },
        enabled: !!product && open
    });

    const { data: batches, isLoading: isLoadingBatches } = useQuery<Batch[]>({
        queryKey: ["active-batches", product?.id],
        queryFn: async () => {
            const res = await apiFetch(`/api/products/${product.id}/active-batches`);
            return res.json();
        },
        enabled: !!product && open
    });

    // Handle auto-selection if only one option exists
    useEffect(() => {
        if (open && variations && variations.length === 1 && !selectedVariation) {
            setSelectedVariation(variations[0]);
        }
        if (open && batches && batches.length === 1 && !selectedBatch) {
            setSelectedBatch(batches[0]);
        }
    }, [open, variations, batches]);

    const handleConfirm = () => {
        if (product.batchTrackingEnabled && !selectedBatch) return;
        onSelect({ 
            variation: selectedVariation || undefined, 
            batch: selectedBatch || undefined 
        });
        setSelectedVariation(null);
        setSelectedBatch(null);
    };

    if (!product) return null;

    const hasVariations = variations && variations.length > 0;
    const needsBatch = product.batchTrackingEnabled;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl rounded-[2.5rem] p-8">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                            {product.isPrescriptionOnly ? <Pill className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl font-black text-slate-900">{product.name}</DialogTitle>
                            <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                {product.genericName || "Select options to add to cart"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Variations Column */}
                    {hasVariations ? (
                        <div className="space-y-4">
                            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                <Tag className="w-3 h-3" />
                                Variations / Sizes
                            </h4>
                            <ScrollArea className="h-[250px] pr-4">
                                <div className="space-y-2">
                                    {variations.map((v) => (
                                        <Card 
                                            key={v.id} 
                                            className={`rounded-2xl cursor-pointer transition-all border-2 ${selectedVariation?.id === v.id ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
                                            onClick={() => setSelectedVariation(v)}
                                        >
                                            <CardContent className="p-3 flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-sm text-slate-900">{v.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">${v.price}</p>
                                                </div>
                                                <Badge variant="outline" className="rounded-lg text-[10px] bg-white">
                                                    {Number(v.stockLevel).toFixed(0)}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3">
                            <div className="p-4 bg-white rounded-full text-slate-200">
                                <Tag className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Standard Version Only</p>
                        </div>
                    )}

                    {/* Batches Column */}
                    {needsBatch ? (
                        <div className="space-y-4">
                            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                <Box className="w-3 h-3" />
                                Available Batches
                            </h4>
                            <ScrollArea className="h-[250px] pr-4">
                                <div className="space-y-2">
                                    {batches?.map((b) => {
                                        const expiry = new Date(b.expiryDate);
                                        const isExpiringSoon = expiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                        
                                        return (
                                            <Card 
                                                key={b.id} 
                                                className={`rounded-2xl cursor-pointer transition-all border-2 ${selectedBatch?.id === b.id ? 'border-emerald-500 bg-emerald-50/50 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
                                                onClick={() => setSelectedBatch(b)}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-black text-sm text-slate-900">#{b.batchNumber}</p>
                                                        <Badge className={`${isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'} text-[9px]`}>
                                                            {Number(b.stockLevel).toFixed(0)} units
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Calendar className="w-3 h-3" />
                                                        <p className="text-[10px] font-bold uppercase">Exp: {format(expiry, "MMM dd, yyyy")}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    {batches?.length === 0 && !isLoadingBatches && (
                                        <div className="p-6 bg-red-50 rounded-2xl flex flex-col items-center text-center">
                                            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                                            <p className="text-xs font-black text-red-900 uppercase">No active batches</p>
                                            <p className="text-[10px] text-red-700 mt-1">Stock cannot be sold without a valid batch.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3">
                            <div className="p-4 bg-white rounded-full text-slate-200">
                                <Box className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Batch Tracking Disabled</p>
                        </div>
                    )}
                </div>

                {product.isPrescriptionOnly && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-900 leading-tight">
                            PRESCRIPTION REQUIRED. Please verify valid prescription before processing this medication.
                        </p>
                    </div>
                )}

                <DialogFooter className="mt-8 gap-3 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Cancel</Button>
                    <Button 
                        onClick={handleConfirm}
                        disabled={(needsBatch && !selectedBatch)}
                        className="btn-gradient rounded-xl font-black min-w-[140px]"
                    >
                        Add to Cart
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
