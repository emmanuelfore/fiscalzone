import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, ShieldCheck, ExternalLink, Info } from "lucide-react";

interface CommunicationSettingsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function CommunicationSettings({ formData, setFormData }: CommunicationSettingsProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Communication Gateway</h2>
        <p className="text-sm text-slate-500">Configure how the system sends emails and notifications</p>
      </div>

      <Card className="card-depth border-none max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center text-lg text-violet-600">
            <Mail className="w-5 h-5 mr-2" />
            Resend Email API
          </CardTitle>
          <CardDescription>Transactional email delivery service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Resend API Key</Label>
            <Input
              type="password"
              value={formData.emailSettings?.apiKey || ""}
              onChange={e => setFormData({
                ...formData,
                emailSettings: { ...formData.emailSettings, apiKey: e.target.value }
              })}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono h-11"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sender Name</Label>
              <Input
                value={formData.emailSettings?.fromName || ""}
                onChange={e => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, fromName: e.target.value }
                })}
                placeholder="e.g. Accounts Team"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sender Email</Label>
              <Input
                value={formData.emailSettings?.fromEmail || ""}
                onChange={e => setFormData({
                  ...formData,
                  emailSettings: { ...formData.emailSettings, fromEmail: e.target.value }
                })}
                placeholder="billing@yourdomain.com"
                className="h-11"
              />
            </div>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-amber-900 font-bold uppercase tracking-tighter">Domain Verification Required</p>
              <p className="text-xs text-amber-800 leading-relaxed font-medium italic">
                You must verify your sending domain in the Resend dashboard before emails can be sent to external addresses. For testing, you can use <code>onboarding@resend.dev</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
       <a 
        href="https://resend.com/domains" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors px-4"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open Resend Dashboard
      </a>
    </div>
  );
}
