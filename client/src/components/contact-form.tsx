import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactFormProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ContactForm({ isOpen, onClose }: ContactFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast({
            title: "Message Sent!",
            description: "We'll get back to you within 24 hours.",
            className: "bg-green-50 border-green-200",
        });

        setFormData({ name: "", email: "", phone: "", company: "", message: "" });
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 p-8 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-3xl font-bold mb-2">Get in Touch</h2>
                    <p className="text-violet-100">
                        Request a demo or ask us anything about FiscZim
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Full Name *
                            </label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                className="h-12 border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Email Address *
                            </label>
                            <Input
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                className="h-12 border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Phone Number
                            </label>
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+263 XX XXX XXXX"
                                className="h-12 border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Company Name
                            </label>
                            <Input
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                placeholder="Your Company Ltd"
                                className="h-12 border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Message *
                        </label>
                        <Textarea
                            required
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Tell us about your business and how we can help..."
                            className="min-h-[120px] border-slate-200 focus:border-violet-500 focus:ring-violet-500 resize-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 h-12 btn-gradient rounded-xl text-base font-semibold"
                        >
                            {isSubmitting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Message
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="px-8 h-12 rounded-xl border-2"
                        >
                            Cancel
                        </Button>
                    </div>

                    {/* Contact Info */}
                    <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-violet-600" />
                            <span>support@fisczim.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-violet-600" />
                            <span>+263 XX XXX XXXX</span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
