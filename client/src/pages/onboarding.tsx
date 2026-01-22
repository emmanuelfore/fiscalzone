
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
import { useCreateCompany } from "@/hooks/use-companies";
import { useLocation } from "wouter";
import { Loader2, Building2, User, Lock, Mail, ImagePlus, ArrowRight, ArrowLeft, UploadCloud } from "lucide-react";
import { insertCompanySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Registration Schema
const registerSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

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

type RegisterFormValues = z.infer<typeof registerSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;

export default function OnboardingPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user, registerWithPassword } = useAuth();
    const createCompany = useCreateCompany();

    // Steps: 0 = Register Details, 1 = Company Basics, 2 = Tax Details
    // If user is already logged in, we skip step 0.
    const [currentStep, setCurrentStep] = useState(user ? 1 : 0);

    // State to hold registration data until final submission
    const [registerData, setRegisterData] = useState<RegisterFormValues | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Registration Form
    const registerForm = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        }
    });

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

    // Step 0: Validate User Details and Move to Next
    const onRegisterNext = (data: RegisterFormValues) => {
        setRegisterData(data); // Store for later
        setCurrentStep(1);
    };

    // Final Submission: Register User (if needed) -> Create Company
    const onFinalSubmit = async (companyData: CompanyFormValues) => {
        setIsSubmitting(true);
        try {
            // 1. If we have registration data and no user, register first
            if (registerData && !user) {
                try {
                    const authRes = await registerWithPassword(registerData);

                    // Allow small delay for session propagation
                    await new Promise(r => setTimeout(r, 1000));
                } catch (regError: any) {
                    throw new Error(`Registration failed: ${regError.message}`);
                }
            }

            // 2. Validate Session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast({
                    title: "Verification Required",
                    description: "Account created! Please check your email to verify your account.",
                    variant: "default"
                });
                // Redirect to auth to wait for verification or sign in
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
                description: "Your account and organization have been created.",
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

            // If it failed at company creation but user was created... 
            // The user is technically logged in now. They can retry just the company part.
            // We stay on the current step.

        } finally {
            setIsSubmitting(false);
        }
    };

    // If user logs in externally (e.g. while on this page), auto-advance
    if (user && currentStep === 0) {
        setCurrentStep(1);
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

            {/* Step 0: Registration View */}
            {currentStep === 0 && (
                <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                    <CardHeader className="text-center pb-6">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-900">Create Account</CardTitle>
                        <CardDescription>Start your ZIMRA compliant journey today</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...registerForm}>
                            <form onSubmit={registerForm.handleSubmit(onRegisterNext)} className="space-y-4">
                                <FormField
                                    control={registerForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                    <Input className="pl-9" placeholder="Full Name" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={registerForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                    <Input className="pl-9" type="email" placeholder="Email Address" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={registerForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                    <Input className="pl-9" type="password" placeholder="Password" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full h-11">
                                    Next: Company Details <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                                <div className="text-center text-sm text-gray-500 mt-4">
                                    Already have an account? <span className="text-primary font-semibold cursor-pointer hover:underline" onClick={() => setLocation("/auth")}>Sign In</span>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {/* Step 1 & 2: Company Wizard */}
            {currentStep > 0 && (
                <Card className="w-full max-w-3xl shadow-xl overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">Setup Organization</h2>
                            <p className="text-slate-400 text-sm">Step {currentStep} of 2</p>
                        </div>
                        <div className="flex gap-2">
                            {/* Indicator Logic: If step 1, show 1 active. If step 2, show 1 and 2 active. */}
                            <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-slate-700'}`} />
                            <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-slate-700'}`} />
                        </div>
                    </div>

                    <CardContent className="p-8">
                        <Form {...companyForm}>
                            <form onSubmit={companyForm.handleSubmit(onFinalSubmit)} className="space-y-6">

                                {/* Step 1: Company Profile (Basics + Logo + Currency) */}
                                <div className={currentStep === 1 ? "block" : "hidden"}>
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Company Profile</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <FormField
                                                control={companyForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Registered Company Name</FormLabel>
                                                        <FormControl><Input placeholder="Acme Holdings Pvt Ltd" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="tradingName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Trading Name (Optional)</FormLabel>
                                                        <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Company Email</FormLabel>
                                                        <FormControl><Input placeholder="billing@acme.com" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone Number</FormLabel>
                                                        <FormControl><Input placeholder="+263 7..." {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem className="col-span-2">
                                                        <FormLabel>Physical Address</FormLabel>
                                                        <FormControl><Input placeholder="123 Samora Machel Ave" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="city"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>City</FormLabel>
                                                        <FormControl><Input placeholder="Harare" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="currency"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Base Currency</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select Currency" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                                                <SelectItem value="ZWG">ZWG - Zimbabwe Gold</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="logoUrl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Company Logo</FormLabel>
                                                        <FormControl>
                                                            <div className="flex items-center gap-4">
                                                                {field.value && (
                                                                    <div className="w-16 h-16 relative border rounded-lg overflow-hidden shrink-0">
                                                                        <img src={field.value} alt="Logo" className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                                <div className="relative flex-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        className="w-full"
                                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                                        disabled={isUploading}
                                                                    >
                                                                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                                                        {field.value ? "Change Logo" : "Upload Logo"}
                                                                    </Button>
                                                                    <Input
                                                                        id="logo-upload"
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={handleFileUpload}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormDescription>Upload your company logo (JPG, PNG)</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex justify-end pt-4">
                                            {/* Validate step 1 before moving to step 2 */}
                                            <Button
                                                type="button"
                                                onClick={async () => {
                                                    const isValid = await companyForm.trigger(["name", "email", "phone", "address", "city", "currency", "logoUrl"]);
                                                    if (isValid) setCurrentStep(2);
                                                }}
                                                className="w-full md:w-auto"
                                            >
                                                Next Step <ArrowRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Tax Details */}
                                <div className={currentStep === 2 ? "block" : "hidden"}>
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Tax & Compliance Details</h3>
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 mb-6">
                                            These details will appear on your fiscal invoices and are required for ZIMRA compliance.
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <FormField
                                                control={companyForm.control}
                                                name="tin"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>TIN (Tax Identification Number)</FormLabel>
                                                        <FormControl><Input placeholder="2000200020" {...field} /></FormControl>
                                                        <FormDescription>Your 10-digit tax number.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="vatNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>VAT Number</FormLabel>
                                                        <FormControl><Input placeholder="123456789" {...field} value={field.value || ""} /></FormControl>
                                                        <FormDescription>Required for fiscalization.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={companyForm.control}
                                                name="bpNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>BP Number (Optional)</FormLabel>
                                                        <FormControl><Input placeholder="0200123456" {...field} /></FormControl>
                                                        <FormDescription>Business Partner Number</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 md:flex-none">
                                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                                            </Button>
                                            <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting}>
                                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Building2 className="mr-2 w-4 h-4" />}
                                                Complete Setup
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
