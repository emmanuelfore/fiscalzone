
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Shield,
    Zap,
    QrCode,
    Calculator,
    BarChart3,
    Users,
    Menu,
    X,
    ArrowRight,
    LayoutDashboard,
    Check,
    CreditCard,
    Globe,
    FileText,
    Receipt,
    Server,
    Cloud,
    Wifi,
    ChevronDown,
    HelpCircle
} from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { WhatsAppBubble } from "@/components/ui/whatsapp-bubble";

const ContactForm = lazy(() => import("@/components/contact-form").then(module => ({ default: module.ContactForm })));

export default function LandingPage() {
    const [, setLocation] = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [contactFormOpen, setContactFormOpen] = useState(false);
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -100]);

    // Colorful feature icons map
    const featureColors = [
        { icon: Shield, color: "text-violet-600", bg: "bg-violet-100", title: "ZIMRA Compliant", desc: "Always up to date with latest tax regulations." },
        { icon: Zap, color: "text-amber-600", bg: "bg-amber-100", title: "FDMS Sync", desc: "Real-time fiscal device synchronization." },
        { icon: QrCode, color: "text-blue-600", bg: "bg-blue-100", title: "Smart QR Codes", desc: "Embeds fiscal signatures automatically." },
        { icon: Calculator, color: "text-emerald-600", bg: "bg-emerald-100", title: "Auto-Tax", desc: "VAT and multiple tax rate automated calculation." },
        { icon: LayoutDashboard, color: "text-orange-600", bg: "bg-orange-100", title: "Smart POS", desc: "Complete Point of Sale system for retail operations." },
        { icon: Check, color: "text-indigo-600", bg: "bg-indigo-100", title: "Inventory", desc: "Track stock levels and manage products easily." },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-violet-500/20 px-0 overflow-x-hidden">
            {/* Top Navigation */}
            <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/20 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            <img src="/fiscalstack-logo.png" alt="FiscalStack" className="h-10" />
                        </div>

                        <div className="hidden md:flex items-center space-x-8">
                            {["Features", "Pricing", "FAQ"].map((item) => (
                                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">
                                    {item}
                                </a>
                            ))}
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                                <Button variant="ghost" className="font-medium hover:bg-violet-50 hover:text-violet-700" onClick={() => setLocation("/auth")}>
                                    Sign In
                                </Button>
                                <Button onClick={() => setLocation("/auth?mode=signup")} className="btn-gradient rounded-full px-6">
                                    Get Started
                                </Button>
                            </div>
                        </div>

                        <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden">
                    <div className="space-y-4">
                        {["Features", "Pricing", "FAQ"].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="block text-2xl font-bold text-slate-900" onClick={() => setMobileMenuOpen(false)}>
                                {item}
                            </a>
                        ))}
                        <div className="pt-8 grid gap-4">
                            <Button size="lg" className="w-full btn-gradient" onClick={() => setLocation("/auth?mode=signup")}>Get Started</Button>
                            <Button size="lg" variant="outline" className="w-full" onClick={() => setLocation("/auth")}>Sign In</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Background */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-slate-50">
                <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-50/50 via-slate-50/50 to-slate-50" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-violet-200/20 blur-[100px]" />
                <div className="absolute left-0 top-1/2 -z-10 h-[400px] w-[400px] rounded-full bg-blue-200/20 blur-[100px]" />
            </div>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-visible z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center lg:text-left"
                        >
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-slate-900 leading-[1.1] mb-8 tracking-tight">
                                Fiscal Intelligence <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600">
                                    Reimagined.
                                </span>
                            </h1>

                            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                                The all-in-one fiscalization platform for Zimbabwe's modern businesses.
                                Seamlessly sync with ZIMRA, manage inventory, and drive growth with smart analytics.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button size="lg" className="h-14 px-8 rounded-full text-lg btn-gradient border-none hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-1" onClick={() => setLocation("/auth?mode=signup")}>
                                    Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-lg text-slate-700 hover:bg-white hover:shadow-md transition-all duration-300" onClick={() => setContactFormOpen(true)}>
                                    Book a Demo
                                </Button>
                            </div>

                            <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 border-t border-slate-200/50 pt-8">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden`}>
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="Avatar" className="w-full h-full" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-sm font-medium text-slate-600">
                                        Trusted by <span className="font-bold text-slate-900">500+</span> businesses
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Infographic Hero Visual */}
                        <div className="relative lg:h-[600px] flex items-center justify-center perspective-1000">

                            {/* Connection Curve (SVG) - Infographic Element */}
                            <svg className="absolute w-[120%] h-[120%] top-[-10%] left-[-10%] z-0 pointer-events-none opacity-40">
                                <path
                                    d="M 100 400 C 150 150, 450 450, 500 100"
                                    stroke="url(#gradient-line)"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeDasharray="8 8"
                                />
                                <defs>
                                    <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                                {/* Moving Packet */}
                                <circle r="4" fill="#06b6d4">
                                    <animateMotion
                                        dur="4s"
                                        repeatCount="indefinite"
                                        path="M 100 400 C 150 150, 450 450, 500 100"
                                    />
                                </circle>
                            </svg>

                            {/* ZIMRA Cloud Node */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-10 right-0 bg-white p-4 rounded-2xl shadow-lg border border-slate-100 z-40 flex items-center gap-2"
                            >
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <Cloud className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">FDMS</div>
                                    <div className="font-bold text-sm text-slate-800">Connected</div>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
                            </motion.div>

                            {/* Main Floating Invoice */}
                            <motion.div
                                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                transition={{ duration: 0.8, type: "spring" }}
                                style={{ y: y2 }}
                                className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-20"
                            >
                                {
                                    /* Scanner Beam Removed */
                                }

                                {/* Invoice Header */}
                                <div className="bg-slate-900 p-6 border-b border-slate-800 flex justify-between items-start text-white">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white rounded-full" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base">TechSolutions Ltd</div>
                                            <div className="text-xs text-slate-400">VAT: 123456789</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono text-slate-300">#INV-2024-001</div>
                                    </div>
                                </div>

                                {/* Invoice Body */}
                                <div className="p-6 space-y-5 bg-white">
                                    {/* Line Items */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                                            <span>Description</span>
                                            <span>Amount</span>
                                        </div>
                                        {[
                                            { desc: "Web Development", price: "$1,200.00" },
                                            { desc: "Hosting (Yearly)", price: "$250.00" },
                                            { desc: "Maintenance", price: "$1,000.00" }
                                        ].map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.8 + (i * 0.2) }}
                                                className="flex justify-between text-sm py-1"
                                            >
                                                <span className="text-slate-700">{item.desc}</span>
                                                <span className="text-slate-900 font-bold font-mono">{item.price}</span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="pt-4 border-t border-slate-100 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="text-slate-700 font-mono">$2,450.00</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">VAT (15%)</span>
                                            <span className="text-slate-700 font-mono">$367.50</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                            <span className="text-slate-900 font-bold text-sm">Total</span>
                                            <span className="text-violet-600 font-bold text-lg font-mono">$2,817.50</span>
                                        </div>
                                    </div>

                                    {/* Footer / QR / Stamp */}
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex items-center gap-3">
                                            <QrCode className="w-10 h-10 text-slate-800" />
                                            <div className="text-[10px] text-slate-400 leading-tight">
                                                Scan to verify<br />Fiscal Signature
                                            </div>
                                        </div>

                                        <motion.div
                                            initial={{ scale: 3, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 2, type: "spring", stiffness: 200, damping: 15 }}
                                            className="px-3 py-1 border-2 border-green-600 text-green-700 rounded-md font-bold uppercase text-xs tracking-wider transform -rotate-6 bg-green-50"
                                        >
                                            Fiscalized
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating Device Node */}
                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute bottom-10 -left-4 bg-white p-4 rounded-2xl shadow-lg border border-slate-100 z-30 flex items-center gap-2"
                            >
                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                    <Server className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Device Status</div>
                                    <div className="font-bold text-sm text-slate-800">Online • Synced</div>
                                </div>
                                <Wifi className="w-4 h-4 text-green-500 animate-pulse ml-2" />
                            </motion.div>

                            {/* Decorative Blobs */}
                            <motion.div
                                className="absolute -right-12 top-20 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl -z-10"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Colorful Grid */}
            <section id="features" className="py-32 bg-slate-50 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <Badge variant="outline" className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50">Power Features</Badge>
                        <h2 className="text-4xl lg:text-5xl font-display font-bold text-slate-900 mb-6">
                            Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">succeed.</span>
                        </h2>
                        <p className="text-xl text-slate-600">
                            Built for speed, compliance, and growth.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {featureColors.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`group p-8 rounded-3xl bg-white border border-slate-100 hover:border-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 ${i === 0 || i === 3 ? 'md:col-span-2' : ''}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center ${f.color} mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300`}>
                                    <f.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 font-display">{f.title}</h3>
                                <p className="text-slate-600 leading-relaxed font-medium opacity-80">
                                    {f.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 bg-white relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20 px-4">
                        <Badge variant="outline" className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50">Pricing</Badge>
                        <h2 className="text-4xl lg:text-5xl font-display font-bold text-slate-900 mb-4">
                            Transparent Pricing
                        </h2>
                        <p className="text-xl text-slate-600">Start for free, scale as you grow.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            { name: "Test Mode", price: "Free", desc: "For development & testing", features: ["Unlimited Invoices (Test)", "Sandboxed FDMS", "API Access", "Dev Support"] },
                            { name: "Production", price: "$150", popular: true, desc: "Per device / year", features: ["Unlimited Invoices", "Live FDMS Sync", "Priority Support", "ZIMRA Compliant"] },
                            { name: "Enterprise", price: "Custom", desc: "For large organizations", features: ["Unlimited Users", "Dedicated Manager", "SLA Assurance", "Custom Integration"] },
                        ].map((plan, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative p-10 rounded-[2.5rem] bg-slate-50 border ${plan.popular ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl shadow-indigo-500/10' : 'border-slate-200'} flex flex-col hover:scale-105 transition-transform duration-300`}
                            >
                                {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg shadow-indigo-500/30">Most Popular</div>}
                                <div className="mb-8">
                                    <h3 className="text-2xl font-bold font-display text-slate-900">{plan.name}</h3>
                                    <p className="text-sm text-slate-500 mb-6 font-medium">{plan.desc}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-bold text-slate-900 tracking-tight">{plan.price}</span>
                                        {plan.price !== "Custom" && <span className="text-slate-500 font-medium">/yr</span>}
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    {plan.features.map((feat) => (
                                        <li key={feat} className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                                            <div className={`w-6 h-6 rounded-full ${plan.popular ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'} flex items-center justify-center flex-shrink-0`}><Check className="w-3.5 h-3.5" /></div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                <Button size="lg" className={`w-full h-14 rounded-2xl font-bold text-base ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25' : 'bg-white border-2 border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50'}`} onClick={() => setLocation("/auth?mode=signup")}>
                                    {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 bg-white relative z-10 overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-fuchsia-500/10 to-orange-500/10 rounded-full blur-3xl -z-10" />

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 border-violet-200 text-violet-600 bg-violet-50">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            FAQ
                        </Badge>
                        <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">
                            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-cyan-500">Questions</span>
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Everything you need to know about FiscalStack and ZIMRA compliance.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                question: "What is ZIMRA compliance and why do I need it?",
                                answer: "ZIMRA (Zimbabwe Revenue Authority) compliance requires all businesses to fiscalize their invoices through approved systems. FiscalStack ensures your invoices meet all ZIMRA requirements, including proper tax calculations, fiscal signatures, and QR codes for verification. Non-compliance can result in penalties and legal issues."
                            },
                            {
                                question: "How does the FDMS integration work?",
                                answer: "Our Fiscal Device Management System (FDMS) integration connects directly with ZIMRA's servers in real-time. Every invoice you create is automatically fiscalized, receives a unique fiscal signature, and is registered with ZIMRA. This happens seamlessly in the background, so you can focus on your business."
                            },
                            {
                                question: "Can I try FiscalStack before committing to a paid plan?",
                                answer: "Absolutely! Our Starter plan is completely free and allows you to create up to 10 invoices per month. This is perfect for freelancers or small businesses just getting started. You can upgrade to Pro or Enterprise at any time as your business grows."
                            },
                            {
                                question: "What happens to my data if I cancel my subscription?",
                                answer: "Your data is always yours. If you cancel, you'll have 30 days to export all your invoices, customer data, and reports. We provide easy export options in multiple formats (PDF, Excel, CSV). After 30 days, data is securely deleted from our servers."
                            },
                            {
                                question: "Is my financial data secure?",
                                answer: "Security is our top priority. We use bank-level encryption (AES-256) for all data at rest and in transit. Our infrastructure is hosted on secure cloud servers with regular backups, DDoS protection, and 24/7 monitoring. We're also fully compliant with ZIMRA's security requirements."
                            },
                            {
                                question: "Can I use FiscalStack for multiple businesses?",
                                answer: "Yes! Our Pro and Enterprise plans support multiple company profiles under one account. You can easily switch between businesses, and each company maintains its own invoices, customers, and reports. This is perfect for accountants or entrepreneurs managing multiple ventures."
                            },
                            {
                                question: "Do you provide customer support?",
                                answer: "We offer comprehensive support across all plans. Starter users get email support with 48-hour response times. Pro users receive priority email support with 24-hour responses. Enterprise customers get dedicated account managers, phone support, and guaranteed SLAs with same-day responses."
                            },
                            {
                                question: "Can I customize my invoice templates?",
                                answer: "Yes! FiscalStack allows you to customize invoice templates with your company logo, brand colors, and custom fields. You can create multiple templates for different types of invoices or clients. All customizations maintain ZIMRA compliance automatically."
                            }
                        ].map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                            >
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white transition-colors duration-200"
                                >
                                    <span className="font-semibold text-slate-900 pr-4 text-lg">
                                        {faq.question}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: openFaqIndex === index ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-shrink-0"
                                    >
                                        <ChevronDown className={`w-5 h-5 ${openFaqIndex === index ? 'text-violet-600' : 'text-slate-400'}`} />
                                    </motion.div>
                                </button>
                                <motion.div
                                    initial={false}
                                    animate={{
                                        height: openFaqIndex === index ? "auto" : 0,
                                        opacity: openFaqIndex === index ? 1 : 0
                                    }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-6 pb-5 text-slate-600 leading-relaxed border-t border-slate-200 pt-4">
                                        {faq.answer}
                                    </div>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Still have questions CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-16 text-center p-8 rounded-3xl bg-gradient-to-br from-violet-50 to-cyan-50 border border-violet-100"
                    >
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">
                            Still have questions?
                        </h3>
                        <p className="text-slate-600 mb-6 max-w-md mx-auto">
                            Our support team is here to help. Get in touch and we'll respond as soon as possible.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button className="btn-gradient rounded-full px-6" onClick={() => setContactFormOpen(true)}>
                                <Globe className="w-4 h-4 mr-2" />
                                Contact Support
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 pt-16 pb-8 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <img src="/fiscalstack-logo.png" alt="FiscalStack" className="h-8" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <a href="mailto:info@fiscalstack.co.zw" className="text-sm text-slate-600 hover:text-violet-600 transition-colors">info@fiscalstack.co.zw</a>
                            <p className="text-sm text-slate-500">© 2026 FiscalStack. Made with ❤️ in Zimbabwe.</p>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Contact Form Modal */}
            {contactFormOpen && (
                <Suspense fallback={null}>
                    <ContactForm isOpen={contactFormOpen} onClose={() => setContactFormOpen(false)} />
                </Suspense>
            )}

            {/* WhatsApp Floating Bubble */}
            <WhatsAppBubble />
        </div>
    );
}
