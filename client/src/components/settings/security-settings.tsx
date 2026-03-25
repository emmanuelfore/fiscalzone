import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Key, Copy, RefreshCw, Loader2, History, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SecuritySettingsProps {
  company: any;
}

export function SecuritySettings({ company }: SecuritySettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: generateApiKey, isPending: isGeneratingKey } = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/api-key`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate API Key");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "API Key updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update API Key", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div>
        <h2 className="text-xl font-bold text-slate-900">Security & Access</h2>
        <p className="text-sm text-slate-500">Manage API credentials and system audit logs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-depth border-none">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-violet-600">
              <Key className="w-5 h-5 mr-2" />
              API Access Credentials
            </CardTitle>
            <CardDescription>Secret keys for external integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {company.apiKey ? (
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Current API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={company.apiKey}
                    readOnly
                    type="password"
                    className="flex-1 bg-slate-50 font-mono text-xs h-11 border-slate-200"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 rounded-xl shadow-sm border-slate-200 hover:border-violet-300"
                    onClick={() => {
                      navigator.clipboard.writeText(company.apiKey!);
                      toast({ title: "Copied!", description: "API Key copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 border-dashed text-[11px] text-amber-800 font-medium italic">
                  Keep this key secret. Anyone with this key can access your company data through the API.
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-sm text-slate-500 font-medium mb-4">No API Key generated yet.</p>
              </div>
            )}

            <Button
              variant={company.apiKey ? "outline" : "default"}
              className={`w-full h-11 rounded-xl font-bold ${!company.apiKey ? "btn-gradient shadow-lg shadow-indigo-100" : "border-slate-200"}`}
              disabled={isGeneratingKey}
              onClick={() => generateApiKey()}
            >
              {isGeneratingKey ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {company.apiKey ? "Regenerate API Key" : "Generate First Key"}
            </Button>
          </CardContent>
        </Card>

        <Card className="card-depth border-none bg-slate-900 text-white overflow-hidden relative group">
          <History className="absolute -right-4 -top-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-700" />
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              System Audit Logs
            </CardTitle>
            <CardDescription className="text-slate-400">
              Track all internal actions and changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Maintain full transparency with a detailed history of every change made to your organization, products, and sales.
            </p>
            <Button 
              variant="secondary" 
              className="w-full h-11 bg-white text-slate-900 hover:bg-slate-50 font-black rounded-xl gap-2"
              onClick={() => window.location.href = "/audit-logs"}
            >
              Access Audit Records
              <ExternalLink className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
