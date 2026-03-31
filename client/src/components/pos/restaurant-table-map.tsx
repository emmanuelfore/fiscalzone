
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Table as TableIcon, Map as MapIcon, ChevronRight, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Table {
    id: number;
    sectionId: number;
    tableName: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'dirty';
    posX: number;
    posY: number;
    shape: 'square' | 'circle' | 'rectangle';
}

interface Section {
    id: number;
    name: string;
}

interface Props {
    companyId: number;
    onSelectTable: (table: Table) => void;
    selectedTableId?: number;
}

export function RestaurantTableMap({ companyId, onSelectTable, selectedTableId }: Props) {
    const queryClient = useQueryClient();
    const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

    const { data: sections, isLoading: isLoadingSections } = useQuery<Section[]>({
        queryKey: ["restaurant-sections", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/restaurant/sections`);
            if (!res.ok) throw new Error("Failed to fetch sections");
            return res.json();
        }
    });

    const { data: tables, isLoading: isLoadingTables } = useQuery<Table[]>({
        queryKey: ["restaurant-tables", activeSectionId],
        queryFn: async () => {
            if (!activeSectionId) return [];
            const res = await apiFetch(`/api/restaurant/sections/${activeSectionId}/tables`);
            if (!res.ok) throw new Error("Failed to fetch tables");
            return res.json();
        },
        enabled: !!activeSectionId
    });

    // Set first section as active by default
    useState(() => {
        if (sections && sections.length > 0 && !activeSectionId) {
            setActiveSectionId(sections[0].id);
        }
    });

    // We need useEffect to sync activeSectionId from sections when it changes
    const [hasSynced, setHasSynced] = useState(false);
    if (sections && sections.length > 0 && !activeSectionId && !hasSynced) {
        setActiveSectionId(sections[0].id);
        setHasSynced(true);
    }

    if (isLoadingSections) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Floor Plan...</p>
            </div>
        );
    }

    if (!sections || sections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-6 text-center p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="p-6 bg-white rounded-3xl shadow-xl shadow-slate-200/50">
                    <MapIcon className="w-12 h-12 text-slate-300" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900">No Floor Plan Configured</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Head over to Settings to create your restaurant sections and tables.
                    </p>
                </div>
                <Button className="btn-gradient rounded-2xl gap-2 px-8 py-6 font-black shadow-lg shadow-primary/20">
                    <Settings className="w-5 h-5" />
                    Configure Layout
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6 animate-in fade-in duration-700">
            {/* Section Tabs */}
            <div className="px-1">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 pb-4">
                        {sections.map((section) => (
                            <Button
                                key={section.id}
                                variant={activeSectionId === section.id ? "default" : "outline"}
                                onClick={() => setActiveSectionId(section.id)}
                                className={cn(
                                    "rounded-2xl px-6 h-12 font-black text-sm transition-all duration-300",
                                    activeSectionId === section.id 
                                        ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" 
                                        : "bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                                )}
                            >
                                {section.name}
                            </Button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
            </div>

            {/* Table Grid (Visual Map) */}
            <div className="flex-1 bg-slate-100/50 rounded-[2.5rem] border-2 border-white shadow-inner p-8 relative overflow-hidden min-h-[500px]">
                {/* Visual Grid Lines */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                
                {isLoadingTables ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                    </div>
                ) : tables && tables.length > 0 ? (
                    <div className="relative w-full h-full">
                        {tables.map((table) => {
                            const isSelected = selectedTableId === table.id;
                            const isOccupied = table.status === 'occupied';
                            
                            return (
                                <div
                                    key={table.id}
                                    className={cn(
                                        "absolute cursor-pointer transition-all duration-500 hover:scale-110 active:scale-95 group",
                                        table.shape === 'circle' ? "rounded-full" : "rounded-2xl"
                                    )}
                                    style={{
                                        left: `${table.posX}%`,
                                        top: `${table.posY}%`,
                                        width: table.shape === 'rectangle' ? '120px' : '90px',
                                        height: '90px',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    onClick={() => onSelectTable(table)}
                                >
                                    {/* Table Body */}
                                    <div className={cn(
                                        "w-full h-full flex flex-col items-center justify-center p-2 relative shadow-2xl transition-all duration-500",
                                        table.shape === 'circle' ? "rounded-full" : "rounded-[1.5rem]",
                                        isSelected 
                                            ? "bg-primary text-white ring-8 ring-primary/20 scale-110 z-10" 
                                            : isOccupied 
                                                ? "bg-amber-500 text-white" 
                                                : "bg-white border-4 border-slate-50 text-slate-900 group-hover:border-primary/30"
                                    )}>
                                        <TableIcon className={cn("w-6 h-6 mb-1", isSelected || isOccupied ? "text-white/80" : "text-slate-300")} />
                                        <span className="text-xs font-black tracking-tighter truncate w-full text-center px-1">
                                            {table.tableName}
                                        </span>
                                        <div className={cn(
                                            "flex items-center gap-0.5 mt-1 opacity-60",
                                            isSelected || isOccupied ? "text-white" : "text-slate-400"
                                        )}>
                                            <Users className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">{table.capacity}</span>
                                        </div>

                                        {/* Status Dot */}
                                        {!isSelected && (
                                            <div className={cn(
                                                "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                                                isOccupied ? "bg-amber-400" : "bg-emerald-400"
                                            )}></div>
                                        )}
                                    </div>
                                    
                                    {/* Shadow/Depth Effect */}
                                    <div className="absolute inset-x-2 -bottom-2 h-4 bg-black/5 blur-md rounded-full -z-10 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
                        <TableIcon className="w-12 h-12 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-[10px]">No Tables in this Section</p>
                    </div>
                )}
            </div>

            {/* Quick Stats / Legend */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Occupied</span>
                    </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Select a table to start an order
                </p>
            </div>
        </div>
    );
}
