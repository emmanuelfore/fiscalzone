import { Layout } from "@/components/layout";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
import { useCreateQuotation, useQuotation, useUpdateQuotation } from "@/hooks/use-quotations";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencies } from "@/hooks/use-currencies";
import { useCompany } from "@/hooks/use-companies";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PDFViewer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/pdf-document";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, ArrowLeft, Check, ChevronsUpDown, Send, Eye, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type LineItem = {
    localId: string;
    productId: number | null;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
};

export default function CreateQuotationPage() {
    const [location, setLocation] = useLocation();
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");

    const searchParams = new URLSearchParams(window.location.search);
    const editId = searchParams.get('edit');
    const isEditing = !!editId;

    const { data: company } = useCompany(companyId);
    const { data: customers } = useCustomers(companyId);
    const { data: products } = useProducts(companyId);
    const { data: currencies } = useCurrencies(companyId);
    const { data: existingQuotation } = useQuotation(editId ? parseInt(editId) : 0);
    const createQuotation = useCreateQuotation();
    const updateQuotation = useUpdateQuotation();
    const { toast } = useToast();
    const { taxTypes } = useTaxConfig(companyId);

    // Form State
    const [customerId, setCustomerId] = useState<string>("");
    const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [expiryDate, setExpiryDate] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
    const [currencyCode, setCurrencyCode] = useState("USD");
    const [exchangeRate, setExchangeRate] = useState("1.00");
    const [items, setItems] = useState<LineItem[]>([
        { localId: Math.random().toString(36).substring(2, 11), productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 15 }
    ]);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (existingQuotation && isEditing) {
            setCustomerId(existingQuotation.customerId.toString());
            if (existingQuotation.issueDate) setIssueDate(new Date(existingQuotation.issueDate).toISOString().split('T')[0]);
            if (existingQuotation.expiryDate) setExpiryDate(new Date(existingQuotation.expiryDate).toISOString().split('T')[0]);
            setNotes(existingQuotation.notes || "");
            setTaxInclusive(existingQuotation.taxInclusive || false);
            setCurrencyCode(existingQuotation.currency || "USD");

            if (existingQuotation.items && existingQuotation.items.length > 0) {
                setItems(existingQuotation.items.map(item => ({
                    localId: Math.random().toString(36).substring(2, 11),
                    productId: item.productId,
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: Number(item.taxRate)
                })));
            }
        }
    }, [existingQuotation, isEditing]);

    const handleAddItem = () => {
        setItems([...items, { localId: Math.random().toString(36).substring(2, 11), productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 15 }]);
    };

    const updateItem = (localId: string, field: keyof LineItem, value: any) => {
        setItems(prev => prev.map(item =>
            item.localId === localId ? { ...item, [field]: value } : item
        ));
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let taxAmount = 0;

        items.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;
            if (taxInclusive) {
                const taxPortion = lineTotal - (lineTotal / (1 + (item.taxRate / 100)));
                subtotal += (lineTotal - taxPortion);
                taxAmount += taxPortion;
            } else {
                subtotal += lineTotal;
                taxAmount += (lineTotal * (item.taxRate / 100));
            }
        });

        return { subtotal, taxAmount, total: subtotal + taxAmount };
    };

    const { subtotal, taxAmount, total } = calculateTotals();

    const handleSave = async (status: string = "draft") => {
        if (!customerId) return toast({ title: "Error", description: "Select a customer", variant: "destructive" });

        const payload = {
            companyId,
            customerId: parseInt(customerId),
            issueDate: new Date(issueDate),
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            notes,
            currency: currencyCode,
            taxInclusive,
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2),
            status,
            items: items.map(item => ({
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                taxRate: item.taxRate.toString(),
                lineTotal: (item.quantity * item.unitPrice).toFixed(2)
            }))
        };

        try {
            if (isEditing) {
                await updateQuotation.mutateAsync({ id: parseInt(editId!), data: payload });
            } else {
                await createQuotation.mutateAsync(payload);
            }
            setLocation("/quotations");
        } catch (e) { }
    };

    return (
        <Layout>
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setLocation("/quotations")} className="pl-0">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <h1 className="text-2xl font-bold">{isEditing ? "Edit Quotation" : "New Quotation"}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleSave("draft")} disabled={createQuotation.isPending || updateQuotation.isPending}>
                        <Save className="w-4 h-4 mr-2" /> Save Draft
                    </Button>
                    <Button variant="outline" onClick={() => setShowPreview(true)}>
                        <Eye className="w-4 h-4 mr-2" /> Preview
                    </Button>
                    <Button onClick={() => handleSave("sent")} disabled={createQuotation.isPending || updateQuotation.isPending}>
                        <Send className="w-4 h-4 mr-2" /> Save & Send
                    </Button>
                </div>
            </div>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Quotation Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 w-full h-full min-h-[500px]">
                        <PDFViewer width="100%" height="100%" className="rounded-lg border">
                            <InvoicePDF
                                invoice={{
                                    invoiceNumber: isEditing && existingQuotation ? existingQuotation.quotationNumber : "PREVIEW",
                                    issueDate: new Date(issueDate),
                                    items: items.map(i => ({
                                        ...i,
                                        lineTotal: (i.quantity * i.unitPrice).toString()
                                    })),
                                    subtotal: subtotal.toString(),
                                    taxAmount: taxAmount.toString(),
                                    total: total.toString(),
                                    currency: currencyCode,
                                    taxInclusive,
                                    notes
                                }}
                                company={company}
                                customer={customers?.find(c => c.id.toString() === customerId)}
                            />
                        </PDFViewer>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Quotation Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        {currencies?.map(c => <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Issue Date</Label>
                                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date</Label>
                                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Description</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Tax%</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.localId}>
                                        <TableCell>
                                            <Input value={item.description} onChange={e => updateItem(item.localId, "description", e.target.value)} placeholder="Item description..." />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.quantity} onChange={e => updateItem(item.localId, "quantity", parseFloat(e.target.value))} />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.unitPrice} onChange={e => updateItem(item.localId, "unitPrice", parseFloat(e.target.value))} />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.taxRate} onChange={e => updateItem(item.localId, "taxRate", parseFloat(e.target.value))} />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {(item.quantity * item.unitPrice).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => items.length > 1 && setItems(items.filter(i => i.localId !== item.localId))}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span>{currencyCode} {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tax</span>
                                <span>{currencyCode} {taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="pt-4 border-t flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span className="text-primary">{currencyCode} {total.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-4">
                                <input type="checkbox" id="taxInc" checked={taxInclusive} onChange={e => setTaxInclusive(e.target.checked)} />
                                <Label htmlFor="taxInc" className="text-xs cursor-pointer">Prices are tax inclusive</Label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Terms, conditions, or payment info..." rows={5} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout >
    );
}
