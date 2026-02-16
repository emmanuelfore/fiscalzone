import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ManageCategoriesDialogProps {
    companyId: number;
}

export function ManageCategoriesDialog({ companyId }: ManageCategoriesDialogProps) {
    const [open, setOpen] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: categories, isLoading } = useQuery({
        queryKey: ["product-categories", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/product-categories?companyId=${companyId}`);
            if (!res.ok) throw new Error("Failed to fetch categories");
            return res.json();
        },
        enabled: open
    });

    const createCategory = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiFetch("/api/product-categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyId, name })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to create category");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product-categories", companyId] });
            setNewCategory("");
            toast({ title: "Category Created", description: "New category added successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiFetch(`/api/product-categories/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete category");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product-categories", companyId] });
            toast({ title: "Category Deleted", description: "Category removed successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleCreate = () => {
        if (!newCategory.trim()) return;
        createCategory.mutate(newCategory.trim());
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Tag className="w-4 h-4 mr-2" />
                    Manage Categories
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Product Categories</DialogTitle>
                    <DialogDescription>
                        Manage categories to organize your products and services.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 py-4">
                    <Input
                        placeholder="New Category Name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                    <Button onClick={handleCreate} disabled={createCategory.isPending || !newCategory.trim()}>
                        {createCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-slate-500">Existing Categories</h4>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {isLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                        ) : categories?.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-8">No categories found.</p>
                        ) : (
                            <div className="space-y-2">
                                {categories?.map((cat: any) => (
                                    <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-white">{cat.name}</Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteCategory.mutate(cat.id)}
                                            disabled={deleteCategory.isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
