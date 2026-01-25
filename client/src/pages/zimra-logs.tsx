
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, XCircle, Search, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompanies } from "@/hooks/use-companies";
import { Layout } from "@/components/layout";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ZimraLogs() {
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [endpointFilter, setEndpointFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const location = useLocation();

    // Resolve Company ID correctly
    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;
    const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
    const selectedCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = selectedCompany?.id;

    const { data: logs, isLoading, refetch } = useQuery({
        queryKey: ['/api/companies', companyId, 'zimra/logs'],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await fetch(`/api/companies/${companyId}/zimra/logs`, {
                credentials: 'include'
            });
            if (!res.ok) {
                if (res.status === 401) throw new Error("Unauthorized - Please login again");
                throw new Error("Failed to fetch logs");
            }
            return res.json();
        },
        enabled: !!companyId
    });

    // Get unique endpoints for filter dropdown
    const uniqueEndpoints = Array.from(new Set(logs?.map((log: any) => log.endpoint).filter(Boolean))) as string[];

    const filteredLogs = logs?.filter((log: any) => {
        // Search filter
        const matchesSearch = !search || (
            (log.requestPayload && JSON.stringify(log.requestPayload).toLowerCase().includes(search.toLowerCase())) ||
            (log.endpoint && log.endpoint.toLowerCase().includes(search.toLowerCase())) ||
            (log.errorMessage && log.errorMessage.toLowerCase().includes(search.toLowerCase())) ||
            (log.invoiceId && log.invoiceId.toString().includes(search))
        );

        // Endpoint filter
        const matchesEndpoint = endpointFilter === "all" || log.endpoint === endpointFilter;

        // Status filter
        const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "success" && isSuccess) ||
            (statusFilter === "error" && !isSuccess);

        return matchesSearch && matchesEndpoint && matchesStatus;
    }) || [];

    if (isLoadingCompanies) return <Layout><div className="p-8">Loading...</div></Layout>;

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/zimra-settings">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">ZIMRA Transaction Logs</h1>
                            <p className="text-muted-foreground">
                                View detailed logs of all requests made to the FDMS API.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>



                <Card>
                    <CardHeader>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Transaction History</CardTitle>
                                    <CardDescription>Recent API interactions with ZIMRA FDMS ({filteredLogs.length} logs)</CardDescription>
                                </div>
                            </div>

                            <div className="flex gap-4 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search logs..."
                                        className="pl-8"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <Select value={endpointFilter} onValueChange={setEndpointFilter}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Filter by endpoint" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Endpoints</SelectItem>
                                        {uniqueEndpoints.map(endpoint => (
                                            <SelectItem key={endpoint} value={endpoint}>{endpoint}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Type/Endpoint</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                Loading logs...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log: any) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono text-xs">
                                                    {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                                                </TableCell>
                                                <TableCell>
                                                    {log.endpoint || "Unknown Request"}
                                                </TableCell>
                                                <TableCell>
                                                    {log.statusCode >= 200 && log.statusCode < 300 ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Success ({log.statusCode})
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                                                            <XCircle className="w-3 h-3 mr-1" />
                                                            Error {log.statusCode ? `(${log.statusCode})` : ''}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {log.invoiceId ? (
                                                        <Link href={`/invoices/${log.invoiceId}`}>
                                                            <Button variant="ghost" className="h-auto p-0 text-blue-600 hover:text-blue-800 underline">
                                                                #{log.invoiceId}
                                                            </Button>
                                                        </Link>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <Info className="h-4 w-4 mr-2" />
                                                                Details
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[80vh]">
                                                            <DialogHeader>
                                                                <DialogTitle>Transaction Details</DialogTitle>
                                                                <DialogDescription>
                                                                    {format(new Date(log.createdAt), "PPP p")}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <ScrollArea className="h-[60vh] pr-4">
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <h4 className="text-sm font-medium mb-2">Request Payload</h4>
                                                                        <div className="bg-muted p-4 rounded-md overflow-x-auto">
                                                                            <pre className="text-xs font-mono">
                                                                                {JSON.stringify(log.requestPayload, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-sm font-medium mb-2">Response Payload</h4>
                                                                        <div className="bg-muted p-4 rounded-md overflow-x-auto">
                                                                            <pre className={`text-xs font-mono ${log.errorMessage ? 'text-red-500' : ''}`}>
                                                                                {JSON.stringify(log.responsePayload, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                    {log.errorMessage && (
                                                                        <div>
                                                                            <h4 className="text-sm font-medium mb-2 text-red-600">Error Message</h4>
                                                                            <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                                                                {log.errorMessage}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </ScrollArea>
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
