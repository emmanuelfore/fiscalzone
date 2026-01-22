import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface DeviceStatus {
    isConfigured: boolean;
    isOnline: boolean;
    fiscalDayOpen: boolean;
    fiscalDayNumber: number | null;
    lastSync: string | null;
    certificateExpiry: string | null;
}

export function useDeviceStatus(companyId: number) {
    return useQuery<DeviceStatus>({
        queryKey: ["device-status", companyId],
        queryFn: async () => {
            try {
                const res = await apiFetch(`/api/companies/${companyId}/zimra/status`);

                // If backend says Not Registered (400)
                if (res.status === 400) {
                    return {
                        isConfigured: false,
                        isOnline: false,
                        fiscalDayOpen: false,
                        fiscalDayNumber: null,
                        lastSync: null,
                        certificateExpiry: null
                    };
                }

                if (!res.ok) {
                    throw new Error("Failed to fetch device status");
                }

                const data = await res.json();

                // Map ZimraStatusResponse to DeviceStatus
                return {
                    isConfigured: true,
                    isOnline: true, // If we reached here, api call worked
                    fiscalDayOpen: data.fiscalDayStatus === 'FiscalDayOpened',
                    fiscalDayNumber: data.lastFiscalDayNo,
                    lastSync: data.fiscalDayClosed || null,
                    certificateExpiry: null
                };
            } catch (error) {
                console.error("Device status fetch error:", error);
                throw error;
            }
        },
        enabled: !!companyId,
        refetchInterval: 60000, // Poll every 60 seconds
    });
}
