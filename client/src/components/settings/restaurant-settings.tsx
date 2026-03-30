
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Map as MapIcon, Plus, Trash2, Edit2, Loader2, Table as TableIcon, Layout, Settings, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Section {
    id: number;
    name: string;
}

interface Table {
    id: number;
    sectionId: number;
    tableName: string;
    capacity: number;
    posX: number;
    posY: number;
    shape: 'square' | 'circle' | 'rectangle';
}

interface Props {
    company: any;
    onUpdate: (data: any) => Promise<void>;
}

export function RestaurantSettings({ company, onUpdate }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    
    const settings = company.restaurantSettings || { enabled: false };
    const enabled = settings.enabled;

    const { data: sections, isLoading: isLoadingSections } = useQuery<Section[]>({
        queryKey: ["restaurant-sections", company.id],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${company.id}/restaurant/sections`);
            return res.json();
        }
    });

    const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
    const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
    const [isAddTableOpen, setIsAddTableOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");
    const [newTableData, setNewTableData] = useState({
        tableName: "",
        capacity: 4,
        posX: 50,
        posY: 50,
        shape: 'square' as const
    });

    const { data: tables, isLoading: isLoadingTables } = useQuery<Table[]>({
        queryKey: ["restaurant-tables", activeSectionId],
        queryFn: async () => {
            if (!activeSectionId) return [];
            const res = await apiFetch(`/api/restaurant/sections/${activeSectionId}/tables`);
            return res.json();
        },
        enabled: !!activeSectionId
    });

    const handleToggleEnabled = async (val: boolean) => {
        try {
            await onUpdate({
                restaurantSettings: {
                    ...settings,
                    enabled: val
                }
            });
            toast({ title: val ? "Restaurant Mode Enabled" : "Restaurant Mode Disabled" });
        } catch (e: any) {
            toast({ title: "Failed to update settings", variant: "destructive" });
        }
    };

    const createSectionMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiFetch(`/api/companies/${company.id}/restaurant/sections`, {
                method: "POST",
                body: JSON.stringify({ name })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurant-sections", company.id] });
            toast({ title: "Section created" });
            setIsAddSectionOpen(false);
            setNewSectionName("");
        }
    });

    const createTableMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiFetch(`/api/restaurant/sections/${activeSectionId}/tables`, {
                method: "POST",
                body: JSON.stringify(data)
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurant-tables", activeSectionId] });
            toast({ title: "Table created" });
            setIsAddTableOpen(false);
            setNewTableData({
                tableName: "",
                capacity: 4,
                posX: 50,
                posY: 50,
                shape: 'square'
            });
        }
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Switch */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-indigo-100 overflow-hidden bg-white/80 backdrop-blur-xl">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200">
                                <Layout className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-900">Restaurant Mode</h2>
                                <p className="text-sm font-medium text-slate-500">Enable table management, floor plans, and BOM recipes.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[1.25rem] border border-slate-100">
                            <span className={enabled ? "text-indigo-600 font-black" : "text-slate-400 font-bold"}>
                                {enabled ? "ACTIVE" : "DISABLED"}
                            </span>
                            <Switch checked={enabled} onCheckedChange={handleToggleEnabled} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {enabled && (
                <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
                    {/* Sections Sidebar */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black text-slate-900">Floor Sections</h3>
                                <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="rounded-xl border-slate-200 hover:border-indigo-600 group"
                                        >
                                            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                                            Add
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-w-sm">
                                        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
                                            <div className="relative z-10">
                                                <DialogTitle className="text-2xl font-black mb-1">New Section</DialogTitle>
                                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Floor Plan Organization</p>
                                            </div>
                                            <Layout className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                                        </div>
                                        <div className="p-8 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Section Name</Label>
                                                <Input 
                                                    placeholder="Main Hall, Terrace, VIP..." 
                                                    className="rounded-2xl border-slate-100 bg-slate-50 h-12 px-5 font-bold focus:ring-indigo-600 focus:border-indigo-600"
                                                    value={newSectionName}
                                                    onChange={(e) => setNewSectionName(e.target.value)}
                                                />
                                            </div>
                                            <Button 
                                                className="w-full h-12 rounded-2xl btn-gradient font-black shadow-xl shadow-indigo-100 disabled:opacity-50"
                                                onClick={() => {
                                                    if (newSectionName) createSectionMutation.mutate(newSectionName);
                                                }}
                                                disabled={createSectionMutation.isPending || !newSectionName}
                                            >
                                                {createSectionMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "CREATE SECTION"}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                        </div>

                        <div className="grid gap-3">
                            {isLoadingSections ? (
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                            ) : sections?.map(section => (
                                <div 
                                    key={section.id}
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={`
                                        group cursor-pointer p-4 rounded-[1.5rem] border-2 transition-all duration-300 flex items-center justify-between
                                        ${activeSectionId === section.id 
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]" 
                                            : "bg-white border-transparent text-slate-600 hover:border-slate-200 shadow-sm hover:shadow-md"}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <MapIcon className={`w-5 h-5 ${activeSectionId === section.id ? "text-white/80" : "text-slate-300"}`} />
                                        <span className="font-black text-sm uppercase tracking-wider">{section.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className={`border-none rounded-lg px-2 ${activeSectionId === section.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>
                                            ID: {section.id}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {(!sections || sections.length === 0) && (
                                <div className="text-center py-12 px-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No sections found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tables Management */}
                    <div className="space-y-6">
                        {activeSectionId ? (
                            <>
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-black text-slate-900">
                                            Tables in {sections?.find(s => s.id === activeSectionId)?.name}
                                        </h3>
                                    </div>
                                    <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="btn-gradient rounded-xl gap-2 shadow-lg shadow-indigo-100">
                                                <Plus className="w-4 h-4" />
                                                Add Table
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white max-w-md">
                                            <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
                                                <div className="relative z-10">
                                                    <DialogTitle className="text-3xl font-black mb-1">New Table</DialogTitle>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Adding to {sections?.find(s => s.id === activeSectionId)?.name}</p>
                                                </div>
                                                <TableIcon className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 -rotate-12" />
                                            </div>
                                            <div className="p-10 space-y-8">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2 col-span-2">
                                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Display Name</Label>
                                                        <Input 
                                                            placeholder="Table 01" 
                                                            className="rounded-2xl border-slate-100 bg-slate-50 h-12 px-5 font-bold"
                                                            value={newTableData.tableName}
                                                            onChange={(e) => setNewTableData({...newTableData, tableName: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Capacity</Label>
                                                        <Input 
                                                            type="number"
                                                            className="rounded-2xl border-slate-100 bg-slate-50 h-12 px-5 font-bold"
                                                            value={newTableData.capacity}
                                                            onChange={(e) => setNewTableData({...newTableData, capacity: parseInt(e.target.value)})}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Shape</Label>
                                                        <Select 
                                                            value={newTableData.shape} 
                                                            onValueChange={(v: any) => setNewTableData({...newTableData, shape: v})}
                                                        >
                                                            <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50 h-12 px-5 font-bold">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl border-none shadow-xl">
                                                                <SelectItem value="square">Square</SelectItem>
                                                                <SelectItem value="circle">Round</SelectItem>
                                                                <SelectItem value="rectangle">Long</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <Button 
                                                    className="w-full h-14 rounded-2xl btn-gradient font-black shadow-xl shadow-indigo-100 uppercase tracking-wider"
                                                    onClick={() => {
                                                        if (newTableData.tableName) createTableMutation.mutate(newTableData);
                                                    }}
                                                    disabled={createTableMutation.isPending || !newTableData.tableName}
                                                >
                                                    {createTableMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "ADD TABLE TO FLOOR"}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {isLoadingTables ? (
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300 col-span-full" />
                                    ) : tables?.map(table => (
                                        <Card key={table.id} className="rounded-[1.5rem] border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
                                            <CardContent className="p-0">
                                                <div className="p-6">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                            <TableIcon className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Seats</span>
                                                            <span className="text-lg font-black text-slate-900">{table.capacity}</span>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-base font-black text-slate-900 mb-1">{table.tableName}</h4>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{table.shape} Layout</p>
                                                </div>
                                                <div className="p-3 bg-slate-50/50 flex gap-2 border-t border-slate-50">
                                                    <Button variant="ghost" size="sm" className="flex-1 rounded-xl h-9 font-bold text-xs text-slate-500 hover:text-indigo-600 hover:bg-white shadow-none">
                                                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                                                        Position
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="rounded-xl h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-white shadow-none">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {(!tables || tables.length === 0) && (
                                        <div className="col-span-full text-center py-20 bg-white/50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                                            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <TableIcon className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No tables defined in this section</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 bg-indigo-50/30 rounded-[3rem] border-2 border-dashed border-indigo-100 text-center">
                                <div className="p-6 bg-white rounded-full shadow-2xl shadow-indigo-100 mb-6">
                                    <Layout className="w-12 h-12 text-indigo-200" />
                                </div>
                                <h3 className="text-xl font-black text-indigo-900 mb-2">Select a Section</h3>
                                <p className="text-sm text-indigo-600/60 max-w-xs mx-auto">Click on a floor section on the left to manage its restaurant tables.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!enabled && (
                <div className="p-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-slate-100 blur-3xl rounded-full scale-150 transform-gpu opacity-50"></div>
                        <div className="relative p-10 bg-white rounded-[2.5rem] shadow-xl border border-slate-50">
                            <Settings className="w-20 h-20 text-slate-100 animate-spin-slow" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-300">Restaurant Features Hidden</h3>
                        <p className="text-sm text-slate-400 max-w-sm">Enable Restaurant Mode at the top to configure your floor plan, sections, and table layouts.</p>
                    </div>
                </div>
            )}
            
            <style>{`
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
