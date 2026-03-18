import { db } from "../db";
import { posShifts, posShiftTransactions, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export async function startPosShift(companyId: number, userId: string, openingBalance: number, notes?: string) {
    // Check if user already has an open shift
    const existingShift = await db.query.posShifts.findFirst({
        where: and(
            eq(posShifts.userId, userId),
            eq(posShifts.companyId, companyId),
            eq(posShifts.status, "open")
        )
    });

    if (existingShift) {
        throw new Error("User already has an open shift.");
    }

    const [shift] = await db.insert(posShifts).values({
        companyId,
        userId,
        openingBalance: openingBalance.toString(),
        status: "open",
        startTime: new Date(),
        notes
    }).returning();

    return shift;
}

export async function endPosShift(shiftId: number, actualCash: number, notes?: string) {
    const [shift] = await db.update(posShifts)
        .set({
            status: "closed",
            endTime: new Date(),
            actualCash: actualCash.toString(),
            notes
        })
        .where(eq(posShifts.id, shiftId))
        .returning();

    return shift;
}

export async function addPosTransaction(
    shiftId: number,
    userId: string,
    type: 'DROP' | 'PAYOUT',
    amount: number,
    reason: string,
    items: any[] = []
) {
    const [transaction] = await db.insert(posShiftTransactions).values({
        shiftId,
        userId,
        type,
        amount: amount.toString(),
        reason,
        items
    }).returning();

    return transaction;
}

export async function getOpenShift(companyId: number, userId: string) {
    return await db.query.posShifts.findFirst({
        where: and(
            eq(posShifts.userId, userId),
            eq(posShifts.companyId, companyId),
            eq(posShifts.status, "open")
        ),
        with: {
            user: true
        }
    });
}

export async function getShiftTransactions(shiftId: number) {
    return await db.query.posShiftTransactions.findMany({
        where: eq(posShiftTransactions.shiftId, shiftId),
        orderBy: [desc(posShiftTransactions.createdAt)]
    });
}
