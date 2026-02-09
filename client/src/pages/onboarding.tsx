
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCompany } from "@/hooks/use-companies";
import { useLocation } from "wouter";
import { Loader2, Building2, User, Lock, Mail, ImagePlus, ArrowRight, ArrowLeft, UploadCloud, CheckCircle, AlertCircle } from "lucide-react";
import { insertCompanySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Company Onboarding Schema
const companySchema = insertCompanySchema.pick({
    name: true,
    tin: true,
    phone: true,
    email: true,
    address: true,
    city: true,
    vatNumber: true,
    currency: true,
}).extend({
    // Make BP Number optional explicitly
    bpNumber: z.string().optional(),
    logoUrl: z.string().optional(),
    tradingName: z.string().optional(),
    fdmsDeviceId: z.string().optional(),
    fdmsApiKey: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function OnboardingPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user } = useAuth();
    const createCompany = useCreateCompany();

    // Steps: 1 = Company Basics, 2 = Tax Details
    const [currentStep, setCurrentStep] = useState(1);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Company Form
    const companyForm = useForm<CompanyFormValues>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            name: "",
            tin: "",
            vatNumber: "",
            bpNumber: "",
            phone: "",
            email: "",
            address: "",
            city: "Harare",
            logoUrl: "",
            currency: "USD",
        }
    });

    // Handle File Upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await apiFetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Upload failed");
            }

            const data = await res.json();
            companyForm.setValue("logoUrl", data.url);
            toast({ title: "Logo Uploaded", description: "Company logo has been uploaded successfully." });
        } catch (error) {
            console.error("Upload error:", error);
            toast({
                title: "Upload Failed",
                description: "Could not upload logo. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Check for existing companies to redirect if already setup
    const { data: companies } = useQuery({
        queryKey: [api.companies.list.path],
        queryFn: async () => {
            const res = await apiFetch(api.companies.list.path);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!user // Only run if user is logged in
    });

    useEffect(() => {
        if (user && companies && companies.length > 0) {
            console.log("User has companies, redirecting to dashboard...");
            setLocation("/dashboard");
        }
    }, [user, companies, setLocation]);

    // Final Submission: Create Company
    const onFinalSubmit = async (companyData: CompanyFormValues) => {
        setIsSubmitting(true);
        try {
            // 1. Validate Session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast({
                    title: "Session Expired",
                    description: "Please sign in again to complete setup.",
                    variant: "destructive"
                });
                setLocation("/auth");
                return;
            }

            // 2. Create Company
            await createCompany.mutateAsync({
                ...companyData,
                country: "Zimbabwe",
                fdmsDeviceId: companyData.fdmsDeviceId || "",
                fdmsApiKey: companyData.fdmsApiKey || "",
                // vatEnabled defaults to true
            });

            toast({
                title: "Setup Complete!",
                description: "Your organization has been created.",
            });

            setLocation("/dashboard");

        } catch (error: any) {
            console.error("Onboarding Error:", error);

            // Handle specific errors (like duplicate TIN)
            let errorMessage = error.message || "Failed to complete setup.";
            if (errorMessage.includes("tin")) {
                errorMessage = "A company with this TIN already exists.";
            } else if (errorMessage.includes("duplicate key")) {
                errorMessage = "This company or tax number is already registered.";
            }

            toast({
                title: "Setup Failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const StepIndicator = ({ step, label, current }: { step: number; label: string; current: number }) => (
        <div className="flex flex-col items-center gap-2 flex-1">
            <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300",
                step === current ? "bg-primary text-white border-primary shadow-lg scale-110" :
                    step < current ? "bg-green-500 border-green-500 text-white" : "border-slate-200 text-slate-400 bg-white"
            )}>
                {step < current ? <CheckCircle className="w-6 h-6" /> : step}
            </div>
            <span className={cn(
                "text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                step === current ? "text-primary" : "text-slate-400"
            )}>{label}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-xl border-none">
                <CardHeader className="text-center space-y-2 pb-8">
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                        Complete Your Setup
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Let's get your company ready for ZIMRA compliance
                    </CardDescription>

                    {/* Step Progress */}
                    <div className="flex justify-between items-center w-full mt-8 relative">
                        {/* Connecting Lines */}
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                        <div className={cn(
                            "absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 -z-10",
                            currentStep === 1 ? "w-0" : "w-full"
                        )} />

                        <StepIndicator step={1} label="Company Details" current={currentStep} />
                        <StepIndicator step={2} label="Tax & Compliance" current={currentStep} />
                    </div>
                </CardHeader>

                <CardContent className="pt-4 px-8 min-h-[400px]">
                    {/* STEP 1: COMPANY BASICS */}
                    {currentStep === 1 && (
                        <Form {...companyForm}>
                            <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Logo Upload */}
                                <div className="flex flex-col items-center justify-center mb-8 bg-slate-50/50 rounded-2xl p-6 border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors group relative cursor-pointer overflow-hidden">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                    />
                                    {companyForm.watch("logoUrl") ? (
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md">
                                            <img
                                                src={companyForm.watch("logoUrl")}
                                                alt="Logo"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ImagePlus className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                                            {isUploading ? (
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            ) : (
                                                <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-4 text-center">
                                        <p className="text-sm font-semibold text-slate-700">Company Logo</p>
                                        <p className="text-xs text-slate-400 mt-1">Recommended: 400x400px PNG/JPG</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={companyForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">Company Registered Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Logistics (Pvt) Ltd" {...field} className="h-11" />
                                                </FormControl>
                                                <FormMessage className="text-red-500" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={companyForm.control}
                                        name="tradingName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">Trading Name (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Express" {...field} className="h-11" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={companyForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">Company Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="billing@acme.com" {...field} className="h-11" />
                                                </FormControl>
                                                <FormMessage className="text-red-500" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={companyForm.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">Phone Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+263 7..." {...field} className="h-11" />
                                                </FormControl>
                                                <FormMessage className="text-red-500" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={companyForm.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-semibold">Physical Address</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="123 Samora Machel Ave" {...field} className="min-h-[80px]" />
                                            </FormControl>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={companyForm.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700 font-semibold">City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Harare" {...field} className="h-11" />
                                            </FormControl>
                                            <FormMessage className="text-red-500" />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end pt-4">
                                    <Button
                                        type="button"
                                        size="lg"
                                        className="h-12 px-8 font-bold shadow-md hover:shadow-lg transition-all"
                                        onClick={async () => {
                                            const isValid = await companyForm.trigger(["name", "email", "phone", "address", "city"]);
                                            if (isValid) setCurrentStep(2);
                                        }}
                                    >
                                        Next: Tax Details <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}

                    {/* STEP 2: TAX DETAILS */}
                    {currentStep === 2 && (
                        <Form {...companyForm}>
                            <form onSubmit={companyForm.handleSubmit(onFinalSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                    <AlertTitle className="font-bold">Compliance Information</AlertTitle>
                                    <AlertDescription>
                                        Please ensure your TIN and VAT numbers match your ZIMRA registration documents exactly.
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={companyForm.control}
                                        name="tin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">Company TIN</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="10XXXXXX" {...field} className="h-11 font-mono tracking-widest" />
                                                </FormControl>
                                                <FormDescription>10-digit Taxpayer Identification Number</FormDescription>
                                                <FormMessage className="text-red-500" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={companyForm.control}
                                        name="vatNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">VAT Number (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="9XXXXXX" {...field} className="h-11 font-mono tracking-widest" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={companyForm.control}
                                        name="bpNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">BP Number (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="10XXXXXX" {...field} className="h-11 font-mono tracking-widest" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={companyForm.control}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 font-semibold">Default Currency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="Select Base Currency" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="USD">USD - United States Dollar</SelectItem>
                                                        <SelectItem value="ZWG">ZWG - Zimbabwe Gold</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex justify-between gap-4 pt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        className="h-12 px-8 font-semibold"
                                        onClick={() => setCurrentStep(1)}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="h-12 px-12 font-bold shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex-1 md:flex-none"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                                Creating Organization...
                                            </>
                                        ) : (
                                            "Complete Onboarding"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
