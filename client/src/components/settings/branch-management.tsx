import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  MapPin, 
  Building2, 
  Phone, 
  Mail, 
  Pencil, 
  Trash2, 
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Store,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/hooks/use-branches";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { type Branch, type InsertBranch } from "@shared/schema";

interface BranchManagementProps {
  companyId: number;
}

export function BranchManagement({ companyId }: BranchManagementProps) {
  const { data: branches, isLoading } = useBranches(companyId);
  const createBranch = useCreateBranch(companyId);
  const updateBranch = useUpdateBranch(companyId);
  const deleteBranch = useDeleteBranch(companyId);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [formData, setFormData] = useState<Partial<InsertBranch>>({
    name: "",
    code: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    companyId: companyId
  });

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code || "",
        address: branch.address || "",
        city: branch.city || "",
        phone: branch.phone || "",
        email: branch.email || ""
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        companyId: companyId
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingBranch) {
        await updateBranch.mutateAsync({ id: editingBranch.id, ...formData });
        toast({ title: "Success", description: "Branch updated successfully" });
      } else {
        await createBranch.mutateAsync(formData as InsertBranch);
        toast({ title: "Success", description: "Branch created successfully" });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this branch? This action cannot be undone.")) return;
    try {
      await deleteBranch.mutateAsync(id);
      toast({ title: "Success", description: "Branch deleted successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredBranches = branches?.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.code && b.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (b.city && b.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Branch Management</h2>
          <p className="text-sm font-medium text-slate-500">Manage your physical locations and fiscal endpoints</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="rounded-2xl btn-gradient shadow-lg shadow-indigo-100 font-black gap-2 h-11 px-6 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Branch
        </Button>
      </div>

      <Card className="card-depth border-none overflow-hidden hover:shadow-2xl transition-all duration-500">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by branch name, code, or city..." 
              className="pl-12 h-12 rounded-2xl border-slate-200 bg-white/80 focus:bg-white transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Branch Identity</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-8 h-24 bg-slate-50/10" />
                    </tr>
                  ))
                ) : filteredBranches?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <Store className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">No branches found matching your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBranches?.map((branch) => (
                    <tr key={branch.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
                            <Store className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-tight">{branch.name}</p>
                            <Badge variant="outline" className="mt-1 text-[9px] font-black uppercase tracking-tighter rounded-md py-0 bg-white border-slate-200 text-slate-500">
                              {branch.code || "No Code"}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {branch.city || "N/A"}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{branch.address || "No address set"}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {branch.phone || "No phone"}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{branch.email || "No email"}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {branch.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 rounded-full py-0.5 px-3 font-black text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100 rounded-full py-0.5 px-3 font-black text-[10px] flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> INACTIVE
                          </Badge>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-md hover:text-indigo-600 transition-all"
                            onClick={() => handleOpenDialog(branch)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-2xl p-1 w-48">
                              <DropdownMenuItem 
                                className="rounded-lg gap-2 font-bold text-slate-600 focus:text-slate-900 focus:bg-slate-50"
                                onClick={() => handleOpenDialog(branch)}
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-lg gap-2 font-bold text-slate-600 focus:text-slate-900 focus:bg-slate-50">
                                <ExternalLink className="w-3.5 h-3.5" /> View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-lg gap-2 font-bold text-red-600 focus:text-red-700 focus:bg-red-50"
                                onClick={() => handleDelete(branch.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Branch
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white px-8 py-10 pb-12">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 border border-white/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black">{editingBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
            <p className="text-slate-400 text-sm font-medium mt-1">Configure physical location and contact metadata</p>
          </DialogHeader>

          <CardContent className="p-8 space-y-6 -mt-8 bg-white rounded-t-[2rem]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Branch Name</Label>
                <Input 
                  value={formData.name || ""} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Harare North"
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Internal Code (Optional)</Label>
                <Input 
                  value={formData.code || ""} 
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g. HRE001"
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">City</Label>
                <Input 
                  value={formData.city || ""} 
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g. Harare"
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Street Address</Label>
                <Input 
                  value={formData.address || ""} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Business Way"
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 text-blue-600">Contact Email</Label>
                <Input 
                  value={formData.email || ""} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="branch@company.com"
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 text-blue-600">Phone Number</Label>
                <Input 
                  value={formData.phone || ""} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="+263..."
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
            </div>
          </CardContent>

          <DialogFooter className="bg-slate-50 px-8 py-6 gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button 
                onClick={handleSubmit} 
                disabled={createBranch.isPending || updateBranch.isPending}
                className="rounded-xl btn-gradient px-8 font-black shadow-lg shadow-indigo-100"
            >
              {(createBranch.isPending || updateBranch.isPending) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
