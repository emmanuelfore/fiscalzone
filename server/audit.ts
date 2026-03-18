import { storage } from "./storage.js";

export async function logAction(
    companyId: number,
    userId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    details?: any,
    ipAddress?: string
) {
    try {
        await storage.createAuditLog({
            companyId,
            userId: userId === "system" ? null : userId,
            action,
            entityType,
            entityId,
            details,
            ipAddress
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Don't throw - audit logging errors shouldn't break the main flow
    }
}
