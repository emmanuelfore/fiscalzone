
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await apiFetch("/api/upload", {
        method: "POST",
        body: formData, // apiFetch will handle empty content-type for FormData
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onChange(data.url);
      toast({ title: "Success", description: "Image uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 bg-slate-50/50 transition-all aspect-square sm:aspect-video flex items-center justify-center">
        {value ? (
          <>
            <img src={value} alt="Product" className="w-full h-full object-cover rounded-xl" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                className="rounded-full shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Change
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                size="sm" 
                className="rounded-full shadow-lg"
                onClick={() => onChange("")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-slate-400 hover:text-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-4 rounded-full bg-white shadow-sm ring-1 ring-slate-100">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-widest">Upload Product Image</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
          </button>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Uploading...</p>
            </div>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
