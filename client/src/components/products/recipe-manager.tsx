
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Search, Loader2, ChefHat, Save } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";

interface RecipeItem {
    ingredientId: number;
    ingredientName: string;
    quantity: string | number;
    unit: string;
    unitCost?: string | number;
}

interface Props {
    productId: number;
    companyId: number;
}

export function RecipeManager({ productId, companyId }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: allProducts } = useProducts(companyId);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter potential ingredients (anything that's marked as isIngredient)
    const ingredients = allProducts?.filter(p => 
        p.isIngredient && 
        p.id !== productId && 
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    const { data: recipeItems, isLoading } = useQuery<RecipeItem[]>({
        queryKey: ["recipe", productId],
        queryFn: async () => {
            const res = await apiFetch(`/api/products/${productId}/recipe`);
            if (!res.ok) throw new Error("Failed to fetch recipe");
            return res.json();
        }
    });

    const [items, setItems] = useState<RecipeItem[]>([]);

    // Sync remote data to local state when loaded
    useState(() => {
        if (recipeItems) setItems(recipeItems);
    });

    // We need useEffect to sync items from recipeItems when it changes
    const [hasSynced, setHasSynced] = useState(false);
    if (recipeItems && !hasSynced) {
        setItems(recipeItems);
        setHasSynced(true);
    }

    const saveMutation = useMutation({
        mutationFn: async (payload: any[]) => {
            const res = await apiFetch(`/api/products/${productId}/recipe`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to save recipe");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recipe", productId] });
            toast({ title: "Recipe Saved", description: "Product BOM updated successfully." });
        }
    });

    const addItem = (product: any) => {
        if (items.some(item => item.ingredientId === product.id)) {
            toast({ title: "Already added", description: "This ingredient is already in the recipe.", variant: "destructive" });
            return;
        }
        setItems([...items, {
            ingredientId: product.id,
            ingredientName: product.name,
            quantity: "1",
            unit: product.unitOfMeasure || "unit",
            unitCost: product.costPrice
        }]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.ingredientId !== id));
    };

    const updateQuantity = (id: number, qty: string) => {
        setItems(items.map(item => 
            item.ingredientId === id ? { ...item, quantity: qty } : item
        ));
    };

    const handleSave = () => {
        const payload = items.map(item => ({
            parentProductId: productId,
            ingredientProductId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit
        }));
        saveMutation.mutate(payload);
    };

    const totalCost = items.reduce((sum, item) => {
        const cost = Number(item.unitCost || 0);
        const qty = Number(item.quantity || 0);
        return sum + (cost * qty);
    }, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-indigo-600" />
                        Recipe Ingredients
                    </h3>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total BOM Cost</p>
                        <p className="text-xl font-black text-indigo-600">${totalCost.toFixed(2)}</p>
                    </div>
                </div>

                <Card className="card-depth border-none bg-slate-50/50">
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            {items.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium">
                                    No ingredients added yet. Search and add from the right panel.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <div key={item.ingredientId} className="p-4 flex items-center justify-between hover:bg-white transition-colors group">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-sm font-bold text-slate-900 truncate">{item.ingredientName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Unit Cost: ${Number(item.unitCost || 0).toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-24">
                                                    <Input 
                                                        type="number" 
                                                        step="0.0001"
                                                        value={item.quantity} 
                                                        onChange={(e) => updateQuantity(item.ingredientId, e.target.value)}
                                                        className="h-9 text-right font-black rounded-lg border-slate-200 text-sm"
                                                    />
                                                </div>
                                                <div className="w-12 text-xs font-bold text-slate-400 uppercase">{item.unit}</div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => removeItem(item.ingredientId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={saveMutation.isPending}
                        className="btn-gradient px-8 py-6 rounded-2xl font-black gap-2 shadow-xl shadow-indigo-100"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Recipe
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Find Ingredients</p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search ingredients..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11 rounded-xl bg-slate-100 border-none text-sm"
                    />
                </div>

                <ScrollArea className="h-[435px] pr-2">
                    <div className="space-y-2">
                        {ingredients.map((product) => (
                            <div 
                                key={product.id} 
                                className="p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => addItem(product)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600">{product.name}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">SKU: {product.sku}</p>
                                    </div>
                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-[10px] font-black text-slate-700">${fmt(product.costPrice)}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{product.unitOfMeasure || 'unit'}</span>
                                </div>
                            </div>
                        ))}
                        {ingredients.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-xs italic">
                                {searchQuery ? "No matching ingredients" : "No products marked as 'Ingredient' found."}
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <p className="text-[9px] text-slate-400 px-2 italic bg-slate-50 p-2 rounded-lg leading-relaxed">
                    <b>Tip:</b> Only products marked as "Is Ingredient" in inventory show up here.
                </p>
            </div>
        </div>
    );
}

function fmt(val: any) {
    const n = Number(val || 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
