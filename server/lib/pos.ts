import { db } from "../db";
import { posShifts, posShiftTransactions, users, expenses } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

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

export async function endPosShift(shiftId: number, actualCash: number, notes?: string, reconciledBy?: string) {
    const [shift] = await db.update(posShifts)
        .set({
            status: "closed",
            endTime: new Date(),
            actualCash: actualCash.toString(),
            reconciledAt: new Date(),
            reconciledBy: reconciledBy || null,
            reconciliationStatus: "reconciled",
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
    items: any[] = [],
    authorizedBy?: string
) {
    return await db.transaction(async (tx) => {
        // Fetch shift to get companyId
        const shift = await tx.query.posShifts.findFirst({
            where: eq(posShifts.id, shiftId)
        });

        if (!shift) throw new Error("Shift not found");

        const [transaction] = await tx.insert(posShiftTransactions).values({
            shiftId,
            userId,
            type,
            amount: amount.toString(),
            reason,
            items,
            authorizedBy: authorizedBy || null
        }).returning();

        // If it's a payout, also record it as an expense
        if (type === 'PAYOUT') {
            await tx.insert(expenses).values({
                companyId: shift.companyId,
                category: "POS Payout",
                description: reason || "POS Payout",
                amount: amount.toString(),
                currency: "USD", // Default to USD for now, or fetch from company/shift
                expenseDate: new Date(),
                paymentMethod: "Cash",
                reference: `POS-PAYOUT-${transaction.id}`,
                status: "paid",
                notes: `Automatically created from POS Payout in shift #${shiftId}`
            });
        }

        return transaction;
    });
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

export async function getCompanyPosTransactions(companyId: number, startDate: Date, endDate: Date) {
    return await db.select({
        id: posShiftTransactions.id,
        type: posShiftTransactions.type,
        amount: posShiftTransactions.amount,
        reason: posShiftTransactions.reason,
        createdAt: posShiftTransactions.createdAt,
        authorizedBy: posShiftTransactions.authorizedBy,
        userName: users.name
    })
    .from(posShiftTransactions)
    .innerJoin(posShifts, eq(posShiftTransactions.shiftId, posShifts.id))
    .innerJoin(users, eq(posShiftTransactions.userId, users.id))
    .where(and(
        eq(posShifts.companyId, companyId),
        gte(posShiftTransactions.createdAt, startDate),
        lte(posShiftTransactions.createdAt, endDate)
    ))
    .orderBy(desc(posShiftTransactions.createdAt));
}
