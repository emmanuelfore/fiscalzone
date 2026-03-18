import { Paynow } from "paynow";
import { storage } from "./storage.js";

const PAYNOW_INTEGRATION_ID = process.env.PAYNOW_INTEGRATION_ID || "PLACEHOLDER";
const PAYNOW_INTEGRATION_KEY = process.env.PAYNOW_INTEGRATION_KEY || "PLACEHOLDER";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

const paynow = new Paynow(PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY, `${APP_URL}/api/payments/paynow-update`);

export interface PaynowPaymentResult {
    success: boolean;
    redirectUrl?: string;
    pollUrl?: string;
    error?: string;
    reference: string;
}

export const paynowService = {
    /**
     * Initiate a Paynow payment for a subscription
     */
    async initiateSubscription(companyId: number, deviceSerialNo: string, macAddress: string, amount: number, email: string): Promise<PaynowPaymentResult> {
        const reference = `SUB-${companyId}-${deviceSerialNo.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
        const payment = paynow.createPayment(reference, email);

        payment.add("Fiscal Invoicing Subscription", amount);

        try {
            const response = await paynow.send(payment);

            if (response.success) {
                // Save pending subscription to DB
                await storage.createSubscription({
                    companyId,
                    deviceSerialNo,
                    deviceMacAddress: macAddress,
                    paynowReference: reference,
                    pollUrl: response.pollUrl,
                    amount: amount.toString(),
                    status: "pending",
                    notes: `Subscription for device ${deviceSerialNo}`
                });

                return {
                    success: true,
                    redirectUrl: response.redirectUrl,
                    pollUrl: response.pollUrl,
                    reference
                };
            } else {
                return {
                    success: false,
                    error: response.error,
                    reference
                };
            }
        } catch (e: any) {
            console.error("Paynow error:", e);
            return {
                success: false,
                error: e.message,
                reference
            };
        }
    },

    /**
     * Poll Paynow for payment status
     */
    async checkStatus(reference: string): Promise<string> {
        const subscription = await storage.getSubscriptionByReference(reference);
        if (!subscription || !subscription.pollUrl) {
            throw new Error("Subscription not found or poll URL missing");
        }

        try {
            const status = await paynow.pollTransaction(subscription.pollUrl);

            if (status.status === "Paid") {
                await this.handleSuccessfulPayment(subscription);
            } else if (status.status === "Cancelled" || status.status === "Failed") {
                await storage.updateSubscription(subscription.id, { status: status.status.toLowerCase() });
            }

            return status.status;
        } catch (e: any) {
            console.error("Paynow status check error:", e);
            throw e;
        }
    },

    async handleSuccessfulPayment(subscription: any) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription as per requirements

        // Update subscription record
        await storage.updateSubscription(subscription.id, {
            status: "paid",
            startDate,
            endDate
        });

        // Update company subscription status (Legacy support for single-device checks)
        await storage.updateCompany(subscription.companyId, {
            subscriptionStatus: "active",
            subscriptionEndDate: endDate,
            registeredMacAddress: subscription.deviceMacAddress
        });
    }
};
