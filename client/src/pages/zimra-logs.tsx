
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, XCircle, Search, Info, RefreshCw, AlertTriangle, GitBranch } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

    const rawId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const storedCompanyId = isNaN(rawId) ? 0 : rawId;
    const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
    const selectedCompany = companies?.find(c => c.id === storedCompanyId) || companies?.[0];
    const companyId = selectedCompany?.id;

    const { data: logs, isLoading, refetch } = useQuery({
        queryKey: ['/api/companies', companyId, 'zimra/logs'],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await fetch(`/api/companies/${companyId}/zimra/logs`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch logs");
            return res.json();
        },
        enabled: !!companyId
    });

    const { data: seqReport, isLoading: isLoadingSeq, refetch: refetchSeq } = useQuery({
        queryKey: ['/api/companies', companyId, 'zimra/sequence-report'],
        queryFn: async () => {
            if (!companyId) return null;
            const res = await fetch(`/api/companies/${companyId}/zimra/sequence-report`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch sequence report");
            return res.json();
        },
        enabled: !!companyId
    });

    const uniqueEndpoints = Array.from(new Set(logs?.map((log: any) => log.endpoint).filter(Boolean))) as string[];

    const filteredLogs = logs?.filter((log: any) => {
        const matchesSearch = !search || (
            (log.requestPayload && JSON.stringify(log.requestPayload).toLowerCase().includes(search.toLowerCase())) ||
            (log.endpoint && log.endpoint.toLowerCase().includes(search.toLowerCase())) ||
            (log.errorMessage && log.errorMessage.toLowerCase().includes(search.toLowerCase())) ||
            (log.invoiceId && log.invoiceId.toString().includes(search))
        );
        const matchesEndpoint = endpointFilter === "all" || log.endpoint === endpointFilter;
        const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "success" && isSuccess) ||
            (statusFilter === "error" && !isSuccess);
        return matchesSearch && matchesEndpoint && matchesStatus;
    }) || [];

    if (isLoadingCompanies) return <Layout><div className="p-8">Loading...</div></Layout>;

    const seqEntries: any[] = seqReport?.entries || [];
    const gapCount: number = seqReport?.gaps || 0;

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
                            <p className="text-muted-foreground">View detailed logs of all requests made to the FDMS API.</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => { refetch(); refetchSeq(); }} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <Tabs defaultValue="logs">
                    <TabsList>
                        <TabsTrigger value="logs">All Logs</TabsTrigger>
                        <TabsTrigger value="sequence" className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Sequence Report
                            {gapCount > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{gapCount}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ── ALL LOGS TAB ── */}
                    <TabsContent value="logs">
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
                                            <Input placeholder="Search logs..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
                                        </div>
                                        <Select value={endpointFilter} onValueChange={setEndpointFilter}>
                                            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by endpoint" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Endpoints</SelectItem>
                                                {uniqueEndpoints.map(ep => <SelectItem key={ep} value={ep}>{ep}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
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
                                                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading logs...</TableCell></TableRow>
                                            ) : filteredLogs.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found.</TableCell></TableRow>
                                            ) : filteredLogs.map((log: any) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-mono text-xs">{format(new Date(log.createdAt), "MMM d, HH:mm:ss")}</TableCell>
                                                    <TableCell>{log.endpoint || "Unknown Request"}</TableCell>
                                                    <TableCell>
                                                        {log.statusCode >= 200 && log.statusCode < 300 ? (
                                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                                <CheckCircle className="w-3 h-3 mr-1" />Success ({log.statusCode})
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                                                                <XCircle className="w-3 h-3 mr-1" />Error {log.statusCode ? `(${log.statusCode})` : ''}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.invoiceId ? (
                                                            <Link href={`/invoices/${log.invoiceId}`}>
                                                                <Button variant="ghost" className="h-auto p-0 text-blue-600 hover:text-blue-800 underline">#{log.invoiceId}</Button>
                                                            </Link>
                                                        ) : <span className="text-muted-foreground text-xs">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="sm"><Info className="h-4 w-4 mr-2" />Details</Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl max-h-[80vh]">
                                                                <DialogHeader>
                                                                    <DialogTitle>Transaction Details</DialogTitle>
                                                                    <DialogDescription>{format(new Date(log.createdAt), "PPP p")}</DialogDescription>
                                                                </DialogHeader>
                                                                <ScrollArea className="h-[60vh] pr-4">
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <h4 className="text-sm font-medium mb-2">Request Payload</h4>
                                                                            <div className="bg-muted p-4 rounded-md overflow-x-auto">
                                                                                <pre className="text-xs font-mono">{JSON.stringify(log.requestPayload, null, 2)}</pre>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-medium mb-2">Response Payload</h4>
                                                                            <div className="bg-muted p-4 rounded-md overflow-x-auto">
                                                                                <pre className={`text-xs font-mono ${log.errorMessage ? 'text-red-500' : ''}`}>{JSON.stringify(log.responsePayload, null, 2)}</pre>
                                                                            </div>
                                                                        </div>
                                                                        {log.errorMessage && (
                                                                            <div>
                                                                                <h4 className="text-sm font-medium mb-2 text-red-600">Error Message</h4>
                                                                                <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">{log.errorMessage}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </ScrollArea>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── SEQUENCE REPORT TAB ── */}
                    <TabsContent value="sequence">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            Receipt Sequence Chain
                                            {gapCount > 0 && (
                                                <Badge variant="destructive" className="ml-2">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />{gapCount} issue{gapCount !== 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            All SubmitReceipt calls ordered by globalNo — gaps and counter breaks are highlighted.
                                            {seqReport && ` ${seqReport.total} submissions total.`}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoadingSeq ? (
                                    <div className="text-center py-12 text-muted-foreground">Building sequence report...</div>
                                ) : seqEntries.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">No SubmitReceipt logs found.</div>
                                ) : (
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8">#</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Day</TableHead>
                                                    <TableHead>Global No</TableHead>
                                                    <TableHead>Counter</TableHead>
                                                    <TableHead>Invoice</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Result</TableHead>
                                                    <TableHead>Issues</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {seqEntries.map((entry: any, idx: number) => {
                                                    const hasIssues = entry.issues?.length > 0;
                                                    const hasZimraErrors = entry.validationErrors?.some((e: string) => e.startsWith('[Red]'));
                                                    const rowClass = hasIssues
                                                        ? "bg-red-50 hover:bg-red-100"
                                                        : hasZimraErrors
                                                            ? "bg-red-50/50 hover:bg-red-100/50"
                                                            : entry.success
                                                                ? "hover:bg-slate-50"
                                                                : "bg-amber-50 hover:bg-amber-100";

                                                    return (
                                                        <TableRow key={entry.logId} className={rowClass}>
                                                            <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                                                            <TableCell className="font-mono text-xs whitespace-nowrap">
                                                                {entry.timestamp ? format(new Date(entry.timestamp), "MMM d HH:mm:ss") : "—"}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">
                                                                {entry.fiscalDayNo ?? "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={`font-mono font-bold text-sm ${hasIssues ? 'text-red-700' : 'text-slate-800'}`}>
                                                                    {entry.globalNo ?? "—"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-sm">
                                                                {entry.counter ?? "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {entry.invoiceId ? (
                                                                    <Link href={`/invoices/${entry.invoiceId}`}>
                                                                        <Button variant="ghost" className="h-auto p-0 text-blue-600 hover:text-blue-800 underline text-xs">
                                                                            {entry.invoiceNumber || `#${entry.invoiceId}`}
                                                                        </Button>
                                                                    </Link>
                                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {entry.transactionType || "FiscalInvoice"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {entry.success ? (
                                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                                                                        <CheckCircle className="w-3 h-3 mr-1" />OK
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                                                        <XCircle className="w-3 h-3 mr-1" />Failed
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="max-w-xs">
                                                                {(hasIssues || entry.validationErrors?.length > 0) ? (
                                                                    <div className="space-y-1">
                                                                        {entry.issues.map((issue: string, i: number) => (
                                                                            <div key={i} className="flex items-start gap-1">
                                                                                <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                                                                <span className="text-xs text-red-700 font-mono leading-tight">{issue}</span>
                                                                            </div>
                                                                        ))}
                                                                        {entry.validationErrors?.map((e: string, i: number) => {
                                                                            const isRed = e.startsWith('[Red]');
                                                                            const isGrey = e.startsWith('[Grey]') || e.startsWith('[Gray]');
                                                                            const isYellow = e.startsWith('[Yellow]');
                                                                            return (
                                                                                <div key={`ve-${i}`} className={`text-xs font-mono leading-tight px-1.5 py-0.5 rounded ${
                                                                                    isRed ? 'bg-red-100 text-red-700 font-semibold' :
                                                                                    isGrey ? 'bg-slate-100 text-slate-500' :
                                                                                    isYellow ? 'bg-yellow-50 text-yellow-700' :
                                                                                    'bg-orange-50 text-orange-700'
                                                                                }`}>{e}</div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
