import { Layout } from "@/components/layout";
import { useCompanies } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function TeamSettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;

    const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
    const currentCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = currentCompany?.id || 0;

    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserRole, setNewUserRole] = useState("member");

    // Fetch Users
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ["users", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await apiFetch(`/api/companies/${companyId}/users`);
            if (!res.ok) throw new Error("Failed to fetch users");
            return await res.json();
        },
        enabled: !!companyId
    });

    // Add User Mutation
    const addUserMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/users`, {
                method: "POST",
                body: JSON.stringify({ email: newUserEmail, role: newUserRole })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to add user");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", companyId] });
            toast({ title: "User Added", description: `Invited ${newUserEmail} successfully.` });
            setIsAddUserOpen(false);
            setNewUserEmail("");
            setNewUserRole("member");
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // Remove User Mutation
    const removeUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await apiFetch(`/api/companies/${companyId}/users/${userId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to remove user");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", companyId] });
            toast({ title: "User Removed", description: "The user has been removed from the team." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // Update Role Mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
            const res = await apiFetch(`/api/companies/${companyId}/users/${userId}`, {
                method: "PATCH",
                body: JSON.stringify({ role })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update role");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", companyId] });
            toast({ title: "Role Updated", description: "User role updated successfully." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });


    if (isLoadingCompanies) return <Layout><div className="p-8">Loading...</div></Layout>;
    if (!currentCompany) return <Layout><div className="p-8">No company selected.</div></Layout>;

    return (
        <Layout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Team Management</h1>
                    <p className="text-slate-500 mt-1">Manage user access and roles for {currentCompany.name}</p>
                </div>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>
                                Invite a user by email. They must already have a registered account.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    placeholder="user@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={newUserRole} onValueChange={setNewUserRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="owner">Owner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => addUserMutation.mutate()}
                                disabled={addUserMutation.isPending || !newUserEmail}
                            >
                                {addUserMutation.isPending ? "Adding..." : "Add User"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="card-depth border-none">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        Users
                    </CardTitle>
                    <CardDescription>
                        List of users with access to this company.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">Loading users...</TableCell>
                                </TableRow>
                            ) : users?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-slate-500">No users found.</TableCell>
                                </TableRow>
                            ) : (users || []).map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Shield className="w-3 h-3 text-slate-400" />
                                            <Select
                                                defaultValue={user.role}
                                                onValueChange={(val) => updateRoleMutation.mutate({ userId: user.id, role: val })}
                                                disabled={updateRoleMutation.isPending}
                                            >
                                                <SelectTrigger className="h-8 w-[100px] border-none shadow-none bg-transparent hover:bg-slate-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="member">Member</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="owner">Owner</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {/* CreatedAt might not be join date, but it's something */}
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm("Are you sure you want to remove this user?")) {
                                                    removeUserMutation.mutate(user.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </Layout>
    );
}
