import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AuditLogsPage() {
    const selectedCompanyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");

    const { data: logs, isLoading } = useQuery({
        queryKey: ["audit-logs", selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const res = await apiFetch(`/api/companies/${selectedCompanyId}/audit-logs`);
            if (!res.ok) throw new Error("Failed to fetch logs");
            return await res.json();
        },
        enabled: !!selectedCompanyId
    });

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Audit Logs</h1>
                    <p className="text-slate-500 mt-1">
                        Track security events and user actions within your organization.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-slate-500" />
                            <CardTitle>Activity Log</CardTitle>
                        </div>
                        <CardDescription>
                            Showing the most recent 50 actions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Date & Time</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead className="text-right">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading logs...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : logs?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-slate-500">
                                            No activity recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs?.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs text-slate-500">
                                                {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss")}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {/* We might need to fetch user name or just show ID for now if join not handy */}
                                                <span className="font-medium text-slate-700">User #{log.userId?.substring(0, 8)}...</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {log.entityType} {log.entityId ? `(#${log.entityId})` : ''}
                                            </TableCell>
                                            <TableCell className="text-right max-w-[300px] truncate text-xs font-mono text-slate-500">
                                                {log.details ? JSON.stringify(log.details) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
