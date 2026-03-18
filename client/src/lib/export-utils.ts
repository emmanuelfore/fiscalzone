
import { apiFetch } from "./api";

export async function downloadExcel(url: string, filename: string) {
    try {
        const res = await apiFetch(url);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || "Failed to download export");
        }
        
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
        console.error("Export error:", error);
        alert(`Export failed: ${error.message}`);
    }
}
