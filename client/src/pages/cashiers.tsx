import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Plus, Trash2, UserCog, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CashiersPage() {
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");

    // Fetch cashiers (users with role 'cashier')
    const { data: cashiers, isLoading } = useQuery({
        queryKey: ["cashiers", companyId],
        queryFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/users`);
            if (!res.ok) throw new Error("Failed to fetch users");
            const users = await res.json();
            // Filter only cashiers in frontend for now. 
            // In a real app we'd filter on backend: /api/companies/:id/users?role=cashier
            return users.filter((u: any) => u.role === "cashier");
        },
        enabled: !!companyId
    });

    // Invite Cashier Mutation
    const inviteCashier = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteEmail,
                    name: inviteName,
                    role: "cashier"
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to invite cashier");
            }
            return await res.json();
        },
        onSuccess: () => {
            toast({ title: "Invitation Sent", description: `Invite sent to ${inviteEmail}` });
            setIsInviteOpen(false);
            setInviteEmail("");
            setInviteName("");
            queryClient.invalidateQueries({ queryKey: ["cashiers", companyId] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const removeCashier = useMutation({
        mutationFn: async (userId: string) => {
            // For now we'll just delete the user association, effectively removing them from company
            const res = await apiFetch(`/api/companies/${companyId}/users/${userId}`, {
                method: "DELETE" // Or update role to 'member' if we don't want to delete association
            });
            if (!res.ok) throw new Error("Failed to remove cashier");
        },
        onSuccess: () => {
            toast({ title: "Cashier Removed", description: "User access revoked." });
            queryClient.invalidateQueries({ queryKey: ["cashiers", companyId] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: "Could not remove user.", variant: "destructive" });
        }
    });

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Cashier Management</h1>
                        <p className="text-muted-foreground">Manage users with restricted POS access.</p>
                    </div>
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Cashier
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Cashier</DialogTitle>
                                <DialogDescription>
                                    Send an invitation to a new user. They will be restricted to the POS interface.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@example.com" type="email" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => inviteCashier.mutate()} disabled={inviteCashier.isPending}>
                                    {inviteCashier.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                                    Send Invite
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-white rounded-md border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/50" />
                                        <p className="text-muted-foreground mt-2 text-sm">Loading cashiers...</p>
                                    </TableCell>
                                </TableRow>
                            ) : cashiers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <UserCog className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="font-medium">No cashiers found</p>
                                            <p className="text-sm">Add a new cashier to get started.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                cashiers?.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {user.name?.substring(0, 2).toUpperCase() || "US"}
                                                </div>
                                                {user.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-medium">
                                                Active
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to remove this cashier? This will revoke their access to the company immediately.")) {
                                                        removeCashier.mutate(user.id); // Assuming backend accepts user ID or company_user ID
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span className="sr-only">Remove</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Layout>
    );
}
