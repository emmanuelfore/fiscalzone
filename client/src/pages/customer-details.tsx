
import { Layout } from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { useCustomers, useUpdateCustomer, useCustomerStatement } from "@/hooks/use-customers";
import { useCompany } from "@/hooks/use-companies";
import { useInvoices } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Save, Download, FileText, Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { StatementPDF } from "@/components/customers/statement-pdf";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function CustomerDetailsPage() {
    const [, params] = useRoute("/customers/:id");
    const [, setLocation] = useLocation();
    const customerId = parseInt(params?.id || "0");
    const { toast } = useToast();

    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: company } = useCompany(companyId);
    const { data: customers, isLoading: isLoadingCustomer } = useCustomers(companyId);
    const updateCustomer = useUpdateCustomer();

    // We will fetch up to 100 recent invoices for this customer
    const { data: invoicesResult, isLoading: isLoadingInvoices } = useInvoices(companyId, { limit: 100 });

    const customer = customers?.find(c => c.id === customerId);
    const customerInvoices = invoicesResult?.data?.filter((inv: any) => inv.customerId === customerId);

    // Form State
    const [formData, setFormData] = useState<any>({});

    // Statement State
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");

    const { data: statementData, isLoading: isLoadingStatement, refetch: refetchStatement } = useCustomerStatement(
        customerId,
        dateRange.from,
        dateRange.to,
        selectedCurrency
    );

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                email: customer.email || "",
                phone: customer.phone || "",
                address: customer.address || "",
                city: customer.city || "",
                tin: customer.tin || "",
                vatNumber: customer.vatNumber || "",
                currency: customer.currency || "USD",
            });
        }
    }, [customer]);

    const handleSave = async () => {
        try {
            await updateCustomer.mutateAsync({ id: customerId, data: formData });
            toast({ title: "Success", description: "Customer updated successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
        }
    };

    if (isLoadingCustomer) return <Layout><div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div></Layout>;
    if (!customer) return <Layout><div className="p-8">Customer not found</div></Layout>;

    return (
        <Layout>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => setLocation("/customers")} className="pl-0 text-slate-500">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
                </Button>
            </div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
                    <p className="text-slate-500">{customer.email || "No email"}</p>
                </div>
                <div className="flex gap-2">
                    {/* Actions if needed */}
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="statement">Statement of Account</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                            <CardDescription>View and edit customer information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>TIN</Label>
                                    <Input value={formData.tin} onChange={e => setFormData({ ...formData, tin: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSave} disabled={updateCustomer.isPending}>
                                    {updateCustomer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="statement">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Statement of Account</CardTitle>
                                    <CardDescription>View transaction history and running balance</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="ZWG">ZWG</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "LLL dd, y")
                                                    )
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange.from}
                                                selected={{ from: dateRange.from, to: dateRange.to }}
                                                onSelect={(range: any) => {
                                                    if (range?.from) {
                                                        setDateRange({ from: range.from, to: range.to || range.from });
                                                        // Could auto-refetch or let effect/query key do it
                                                    }
                                                }}
                                                numberOfMonths={2}
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    {statementData && company && (
                                        <PDFDownloadLink
                                            document={
                                                <StatementPDF
                                                    data={statementData}
                                                    company={company}
                                                    startDate={dateRange.from}
                                                    endDate={dateRange.to}
                                                />
                                            }
                                            fileName={`Statement-${customer.name}-${format(new Date(), 'yyyyMMdd')}.pdf`}
                                        >
                                            {({ loading }) => (
                                                <Button variant="outline" disabled={loading}>
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                                                    Download PDF
                                                </Button>
                                            )}
                                        </PDFDownloadLink>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingStatement ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                            ) : statementData ? (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-100">
                                        <div>
                                            <p className="text-sm text-slate-500">Opening Balance</p>
                                            <p className="text-xl font-bold text-slate-700">{selectedCurrency} {Number(statementData.openingBalance).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 text-right">Closing Balance</p>
                                            <p className={cn("text-2xl font-bold text-right", statementData.closingBalance > 0 ? "text-red-600" : "text-emerald-600")}>
                                                {selectedCurrency} {Number(statementData.closingBalance).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Reference</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Credit</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {statementData.transactions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found in this period.</TableCell>
                                                </TableRow>
                                            ) : (
                                                statementData.transactions.map((tx: any, i: number) => (
                                                    <TableRow key={i}>
                                                        <TableCell>{format(new Date(tx.date), "dd MMM yyyy")}</TableCell>
                                                        <TableCell className="font-medium text-slate-700">{tx.reference}</TableCell>
                                                        <TableCell>{tx.description}</TableCell>
                                                        <TableCell className="text-right">{tx.debit > 0 ? Number(tx.debit).toFixed(2) : "-"}</TableCell>
                                                        <TableCell className="text-right">{tx.credit > 0 ? Number(tx.credit).toFixed(2) : "-"}</TableCell>
                                                        <TableCell className="text-right font-bold text-slate-900">{Number(tx.balance).toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-muted-foreground">Failed to load statement data.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </Layout>
    );
}
