import { Resend } from 'resend';

interface EmailSettings {
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
}

export async function sendInvoiceEmail(to: string, invoiceNumber: string, pdfBuffer: Buffer, settings?: EmailSettings) {
    // Use DB settings or fallback to process.env
    const apiKey = settings?.apiKey || process.env.RESEND_API_KEY;
    const fromEmail = settings?.fromEmail || 'onboarding@resend.dev';
    const fromName = settings?.fromName || 'Invoicing App';

    if (!apiKey) {
        console.warn("Resend API Key is missing (neither in DB specific settings nor ENV). Email sending skipped.");
        // Simulate success for dev/demo if no key
        return true;
    }

    const resend = new Resend(apiKey);

    try {
        const fromAddress = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

        const data = await resend.emails.send({
            from: fromAddress,
            to: [to],
            subject: `Invoice ${invoiceNumber}`,
            html: `
        <h1>Invoice ${invoiceNumber}</h1>
        <p>Please find attached your invoice.</p>
        <p>Thank you for your business!</p>
      `,
            attachments: [
                {
                    filename: `Invoice-${invoiceNumber}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        return data;
    } catch (error: any) {
        console.error("Failed to send email with Resend:", error?.message || error);
        throw new Error("Failed to send email: " + (error?.message || "Unknown error"));
    }
}
