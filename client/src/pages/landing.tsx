
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

    // Corporate feature icons map
    const featureColors = [
        { icon: Shield, color: "text-slate-900", bg: "bg-slate-100", title: "ZIMRA Compliant", desc: "Always up to date with latest tax regulations." },
        { icon: Zap, color: "text-slate-900", bg: "bg-slate-100", title: "FDMS Sync", desc: "Real-time fiscal device synchronization." },
        { icon: QrCode, color: "text-slate-900", bg: "bg-slate-100", title: "Smart QR Codes", desc: "Embeds fiscal signatures automatically." },
        { icon: Calculator, color: "text-slate-900", bg: "bg-slate-100", title: "Auto-Tax", desc: "VAT and multiple tax rate automated calculation." },
        { icon: LayoutDashboard, color: "text-slate-900", bg: "bg-slate-100", title: "Smart POS", desc: "Complete Point of Sale system for retail operations." },
        { icon: Check, color: "text-slate-900", bg: "bg-slate-100", title: "Inventory", desc: "Track stock levels and manage products easily." },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-slate-900/10 px-0 overflow-x-hidden">
            {/* Top Navigation */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            <img src="/fiscalstack-logo.png" alt="FiscalStack" className="h-8" />
                        </div>

                        <div className="hidden md:flex items-center space-x-8">
                            {["Features", "Pricing", "FAQ"].map((item) => (
                                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                                    {item}
                                </a>
                            ))}
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                                <Button variant="ghost" className="font-semibold text-slate-600 hover:text-slate-900" onClick={() => setLocation("/auth")}>
                                    Sign In
                                </Button>
                                <Button onClick={() => setLocation("/auth?mode=signup")} className="btn-gradient rounded-md px-6 font-bold">
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

            {/* Simple Corporate Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-slate-50/50" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:40px_40px]" />
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
                            <Badge variant="secondary" className="mb-6 px-4 py-1.5 rounded-full bg-slate-100 text-slate-900 border-none font-bold uppercase tracking-wider text-[10px]">
                                Enterprise Fiscalization Platform
                            </Badge>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.05] mb-8 tracking-tight">
                                Modern Fiscal <br />
                                <span className="text-slate-500">
                                    Software solutions.
                                </span>
                            </h1>

                            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                                The trusted fiscalization partner for Zimbabwe's leading enterprises.
                                Reliable ZIMRA synchronization, advanced inventory management, and high-security compliance.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button size="lg" className="h-14 px-8 rounded-md text-lg btn-gradient border-none hover:shadow-xl transition-all duration-300" onClick={() => setLocation("/auth?mode=signup")}>
                                    Get Started Today <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button size="lg" variant="outline" className="h-14 px-8 rounded-md text-lg text-slate-900 border-slate-200 hover:bg-slate-50 transition-all duration-300" onClick={() => setContactFormOpen(true)}>
                                    Contact Sales
                                </Button>
                            </div>

                            <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 border-t border-slate-200 pt-8">
                                <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                                    Trusted by Zimbabwe's Finest
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

            {/* Features Grid */}
            <section id="features" className="py-32 bg-white relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <Badge variant="outline" className="mb-4 border-slate-200 text-slate-500 bg-slate-50 font-bold uppercase tracking-widest text-[10px]">Solutions</Badge>
                        <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                            Enterprise-ready <span className="text-slate-500">Infrastructure.</span>
                        </h2>
                        <p className="text-xl text-slate-600 font-medium">
                            Robust, compliant, and scalable fiscal solutions for every business size.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featureColors.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300"
                            >
                                <div className={`w-12 h-12 rounded-lg ${f.bg} flex items-center justify-center ${f.color} mb-6 transition-transform group-hover:scale-105 duration-300`}>
                                    <f.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                                <p className="text-slate-600 leading-relaxed font-medium opacity-80">
                                    {f.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 bg-slate-50 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20 px-4">
                        <Badge variant="outline" className="mb-4 border-slate-200 text-slate-500 bg-white font-bold uppercase tracking-widest text-[10px]">Investment Plans</Badge>
                        <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                            Transparent Corporate Pricing
                        </h2>
                        <p className="text-xl text-slate-600 font-medium">Scalable solutions for growing enterprises.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            { name: "Development", price: "Free", desc: "System testing & integration", features: ["Unlimited Invoices (Test)", "Sandboxed FDMS Sync", "API Documentation", "Community Support"] },
                            { name: "Professional", price: "$150", popular: true, desc: "Per device / per annum", features: ["Unlimited Invoices", "Real-time FDMS Sync", "Standard Support", "Full Compliance"] },
                            { name: "Enterprise", price: "Custom", desc: "Large scale deployment", features: ["Unlimited Users", "Dedicated Account Manager", "SLA Agreements", "White-glove Setups"] },
                        ].map((plan, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative p-10 rounded-xl bg-white border ${plan.popular ? 'border-slate-900 ring-1 ring-slate-900 shadow-2xl' : 'border-slate-200'} flex flex-col hover:translate-y-[-4px] transition-all duration-300`}
                            >
                                {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">Recommended</div>}
                                <div className="mb-8">
                                    <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                                    <p className="text-sm text-slate-500 mb-6 font-semibold">{plan.desc}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-bold text-slate-900 tracking-tight">{plan.price}</span>
                                        {plan.price !== "Custom" && <span className="text-slate-500 font-bold uppercase text-xs">/ Year</span>}
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-10 flex-1">
                                    {plan.features.map((feat) => (
                                        <li key={feat} className="flex items-center gap-3 text-sm text-slate-700 font-semibold">
                                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3" /></div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                                <Button size="lg" className={`w-full h-14 rounded-md font-bold text-sm ${plan.popular ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50'}`} onClick={() => setLocation("/auth?mode=signup")}>
                                    {plan.price === "Custom" ? "Talk to Sales" : "Get Started"}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 bg-white relative z-10 overflow-hidden">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 border-slate-200 text-slate-500 bg-slate-50 font-bold uppercase tracking-widest text-[10px]">
                            Resources
                        </Badge>
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">
                            Frequently Asked <span className="text-slate-500">Questions.</span>
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                            Expert insights into Zimbabwe's fiscal landscape.
                        </p>
                    </div>

                    <div className="space-y-3">
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
                                answer: "Absolutely! Our Development plan is free and allows you to integrate and test your systems in a sandboxed environment. You can upgrade to Professional or Enterprise at any time as your business requirements evolve."
                            },
                            {
                                question: "Is my financial data secure?",
                                answer: "Security is our top priority. We use bank-level encryption (AES-256) for all data at rest and in transit. Our infrastructure is hosted on secure cloud servers with regular backups, DDoS protection, and 24/7 monitoring. We're also fully compliant with ZIMRA's security requirements."
                            },
                            {
                                question: "Can I use FiscalStack for multiple businesses?",
                                answer: "Yes! Our Enterprise plans support multi-entity management. You can manage multiple company profiles, branch locations, and fiscal devices from a single unified dashboard."
                            },
                            {
                                question: "Do you provide dedicated support?",
                                answer: "We provide professional support across all plans. Professional users get priority assistance, while Enterprise clients receive dedicated account management, phone support, and guaranteed service level agreements (SLAs)."
                            }
                        ].map((faq, index) => (
                            <div
                                key={index}
                                className="bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-200 hover:border-slate-300"
                            >
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                                >
                                    <span className="font-bold text-slate-900 pr-4 text-base">
                                        {faq.question}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180 text-slate-900' : 'text-slate-400'}`} />
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
                                    <div className="px-6 pb-6 text-slate-600 leading-relaxed font-medium border-t border-slate-100 pt-4">
                                        {faq.answer}
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white relative z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center p-12 rounded-xl bg-slate-50 border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">
                            Strategic Partnerships
                        </h3>
                        <p className="text-slate-600 mb-8 max-w-md mx-auto font-medium">
                            Our team is ready to discuss how FiscalStack can integrate into your enterprise workflow.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button className="btn-gradient rounded-md px-8 h-12 font-bold" onClick={() => setContactFormOpen(true)}>
                                <Globe className="w-4 h-4 mr-2" />
                                Contact Enterprise Support
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 pt-20 pb-10 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2">
                            <img src="/fiscalstack-logo.png" alt="FiscalStack" className="h-8 mb-6" />
                            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                                The definitive fiscalization platform for Zimbabwe's modern economy. Built for compliance, engineered for scale.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs">Platform</h4>
                            <ul className="space-y-2">
                                {["Features", "Pricing", "FAQ"].map(item => (
                                    <li key={item}>
                                        <a href={`#${item.toLowerCase()}`} className="text-slate-500 hover:text-slate-900 transition-colors font-medium">{item}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs">Contact</h4>
                            <p className="text-slate-500 font-medium mb-2">info@fiscalstack.co.zw</p>
                            <p className="text-slate-500 font-medium">Harare, Zimbabwe</p>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-slate-400 font-medium">© 2026 FiscalStack. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors font-medium">Privacy Policy</a>
                            <a href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors font-medium">Terms of Service</a>
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

