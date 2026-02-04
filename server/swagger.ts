
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Zimra Invoicing SaaS API',
            version: '1.0.0',
            description: 'API documentation for the Zimra Invoicing SaaS application, including FDMS integration.',
        },
        servers: [
            {
                url: '/api',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                },
                apiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'API Key for external devices (e.g. POS terminals)'
                }
            },
            schemas: {
                LoginRequest: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', example: 'admin' },
                        password: { type: 'string', example: 'password123' },
                    },
                },
                UserResponse: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        username: { type: 'string' },
                        role: { type: 'string' },
                        companyId: { type: 'integer' },
                    },
                },
                Customer: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        vatNumber: { type: 'string' },
                        address: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string' },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        price: { type: 'number' },
                        taxRate: { type: 'number' },
                        currency: { type: 'string' },
                        taxCode: { type: 'string' },
                    },
                },
                Invoice: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        invoiceNumber: { type: 'string' },
                        customerName: { type: 'string' },
                        total: { type: 'number' },
                        status: { type: 'string', enum: ['draft', 'issued', 'paid', 'cancelled'] },
                        issueDate: { type: 'string', format: 'date-time' },
                        fiscalCode: { type: 'string' },
                        currency: { type: 'string', example: 'USD' },
                        customerId: { type: 'integer' },
                        companyId: { type: 'integer' },
                    },
                },
                FiscalizeInvoiceRequest: {
                    type: 'object',
                    properties: {},
                    description: 'No specific body required, uses existing invoice data.',
                },
                FiscalizeInvoiceResponse: {
                    type: 'object',
                    properties: {
                        fiscalCode: { type: 'string' },
                        fiscalSignature: { type: 'string' },
                        qrCodeData: { type: 'string' },
                        status: { type: 'string', example: 'issued' },
                        syncedWithFdms: { type: 'boolean' },
                    },
                },
                ZimraRegistrationRequest: {
                    type: 'object',
                    required: ['deviceId', 'activationKey', 'deviceSerialNo'],
                    properties: {
                        deviceId: { type: 'string', example: '1112223334' },
                        activationKey: { type: 'string', example: '88776655' },
                        deviceSerialNo: { type: 'string', example: 'SW123456' },
                    },
                },
                ZimraRegistrationResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        certificate: { type: 'string', description: 'PEM encoded certificate' },
                    },
                },
                // RevMax/ZIMRA API Schemas
                DeviceCardDetails: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1', description: 'Status code' },
                        Message: { type: 'string', example: 'Success' },
                        QRcode: { type: 'string' },
                        VerificationCode: { type: 'string' },
                        VerificationLink: { type: 'string', example: 'https://fdmstest.zimra.co.zw' },
                        DeviceID: { type: 'string', example: '8135' },
                        DeviceSerialNumber: { type: 'string', example: '460FF1DA017C' },
                        FiscalDay: { type: 'string', example: '61' },
                        Data: {
                            type: 'object',
                            properties: {
                                TIN: { type: 'string', example: '1234567890' },
                                BPN: { type: 'string', example: '200027482' },
                                VAT: { type: 'string', example: '123456789' },
                                COMPANYNAME: { type: 'string', example: 'Axis Solutions Pvt Ltd' },
                                ADDRESS: { type: 'string', example: '14 Arundel Road Alexandra Park Harare' },
                                REGISTRATIONNUMBER: { type: 'string', example: '0000' },
                                SERIALNUMBER: { type: 'string', example: '460FF1DA017C' },
                            },
                        },
                    },
                },
                DeviceStatusResponse: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Success' },
                        DeviceID: { type: 'string' },
                        DeviceSerialNumber: { type: 'string' },
                        FiscalDay: { type: 'string' },
                        Data: {
                            type: 'object',
                            properties: {
                                fiscalDayStatus: { type: 'string', enum: ['FiscalDayOpened', 'FiscalDayClosed'], example: 'FiscalDayOpened' },
                                lastReceiptGlobalNo: { type: 'integer', example: 444 },
                                lastFiscalDayNo: { type: 'integer', example: 61 },
                                operationID: { type: 'string', example: '0HN1OVTDITH0C:00000001' },
                            },
                        },
                    },
                },
                TransactMRequest: {
                    type: 'object',
                    required: ['CURRENCY', 'CUSTOMEREMAIL', 'INVOICENUMBER', 'CUSTOMERNAME', 'INVOICEAMOUNT', 'INVOICETAXAMOUNT', 'INVOICEFLAG', 'ITEMSXML', 'CURRENCIES'],
                    properties: {
                        CURRENCY: { type: 'string', example: 'USD', description: 'Base currency (ISO 4217 code)' },
                        CUSTOMEREMAIL: { type: 'string', example: 'customer@example.com' },
                        INVOICENUMBER: { type: 'string', example: 'INV-2024-001' },
                        CUSTOMERNAME: { type: 'string', example: 'John Doe' },
                        CUSTOMERVATNUMBER: { type: 'string', example: '1234567890', description: '10 digits' },
                        CUSTOMERADDRESS: { type: 'string', example: '14 Arundel Road, Alexandra Park, Harare' },
                        CUSTOMERTELEPHONENUMBER: { type: 'string', example: '+263 XX XXX XXXX' },
                        CUSTOMERTIN: { type: 'string', example: '2000000000', description: '10 digits' },
                        INVOICEAMOUNT: { type: 'string', example: '1010.00' },
                        INVOICETAXAMOUNT: { type: 'string', example: '130.43' },
                        INVOICEFLAG: { type: 'string', enum: ['01', '02', '03'], example: '01', description: '01=Invoice, 02=CreditNote, 03=DebitNote' },
                        ORIGINALINVOICENUMBER: { type: 'string', example: '', description: 'Required for credit/debit notes' },
                        INVOICECOMMENT: { type: 'string', example: '', description: 'Required for credit/debit notes' },
                        ITEMSXML: { type: 'string', example: '<ITEMS><ITEM><HH>1</HH><ITEMCODE>CODE123</ITEMCODE><ITEMNAME1>Product</ITEMNAME1><ITEMNAME2>Description</ITEMNAME2><QTY>1</QTY><PRICE>1000.00</PRICE><AMT>1000.00</AMT><TAX>130.43</TAX><TAXR>15</TAXR></ITEM></ITEMS>' },
                        CURRENCIES: { type: 'string', example: '<CurrenciesReceived><Currency><Name>USD</Name><Amount>1010.00</Amount><Rate>1</Rate></Currency></CurrenciesReceived>' },
                    },
                },
                TransactMExtRequest: {
                    type: 'object',
                    required: ['Currency', 'InvoiceNumber', 'InvoiceAmount', 'InvoiceTaxAmount', 'InvoiceFlag', 'ItemsXML', 'Currencies', 'CustomerEmail'],
                    properties: {
                        Currency: { type: 'string', example: 'USD' },
                        InvoiceNumber: { type: 'string', example: 'INV-2024-001' },
                        InvoiceAmount: { type: 'string', example: '1010.00' },
                        InvoiceTaxAmount: { type: 'string', example: '130.43' },
                        InvoiceFlag: { type: 'string', enum: ['01', '02', '03'], example: '01' },
                        InvoiceComment: { type: 'string' },
                        OriginalInvoiceNumber: { type: 'string' },
                        ItemsXML: { type: 'string' },
                        Currencies: { type: 'string' },
                        CustomerEmail: { type: 'string', example: 'customer@example.com' },
                        CustomerRegisteredName: { type: 'string', example: 'ABC Company (Pvt) Ltd' },
                        CustomerTradeName: { type: 'string', example: 'ABC Trading' },
                        CustomerVATNumber: { type: 'string', example: '1234567890' },
                        CustomerTIN: { type: 'string', example: '2000000000' },
                        CustomerTelephoneNumber: { type: 'string', example: '+263 XX XXX XXXX' },
                        CustomerFullAddress: { type: 'string', example: '14 Arundel Road, Alexandra Park, Harare' },
                        buyerProvince: { type: 'string', example: 'Harare' },
                        buyerStreet: { type: 'string', example: 'Arundel Road' },
                        buyerHouseNo: { type: 'string', example: '14' },
                        buyerCity: { type: 'string', example: 'Alexandra Park' },
                        refDeviceId: { type: 'string', description: 'Optional: Reference device ID for cross-device credit notes' },
                        refReceiptGlobalnumber: { type: 'string', description: 'Optional: Reference receipt global number' },
                        refFiscalDay: { type: 'string', description: 'Optional: Reference fiscal day' },
                    },
                },
                TransactionResponse: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Upload Success - Transacted to Card' },
                        QRcode: { type: 'string', example: 'https://fdmstest.zimra.co.zw/00000000691008202300000001759AD9E75F2222AEC7' },
                        VerificationCode: { type: 'string', example: '9AD9-E75F-2222-AEC7' },
                        DeviceSerialNumber: { type: 'string' },
                        DeviceID: { type: 'string' },
                        FiscalDay: { type: 'string' },
                        Data: {
                            type: 'object',
                            properties: {
                                receipt: { type: 'object', description: 'Full receipt data with line items, taxes, payments, and signature' },
                            },
                        },
                    },
                },
                ZReportResponse: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Success: Fiscal Day Opened' },
                        DeviceID: { type: 'string' },
                        FiscalDay: { type: 'string' },
                        Data: {
                            type: 'object',
                            properties: {
                                ZREPORTS: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            Signature: { type: 'string' },
                                            DATE: { type: 'string' },
                                            TIME: { type: 'string' },
                                            VATNUM: { type: 'string' },
                                            TIN: { type: 'string' },
                                            BPNUM: { type: 'string' },
                                            CURRENCY: { type: 'string' },
                                            TOTALS: { type: 'object' },
                                            VATTOTALS: { type: 'array', items: { type: 'object' } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                GetTransactionResponse: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Success' },
                        Data: {
                            type: 'object',
                            properties: {
                                invoiceNumber: { type: 'string' },
                                receiptData: { type: 'object' },
                                qrCode: { type: 'string' },
                                verificationCode: { type: 'string' },
                                fiscalDayNo: { type: 'integer' },
                                receiptGlobalNo: { type: 'integer' },
                            },
                        },
                    },
                },
                UnProcessedTransactionSummary: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Success' },
                        Data: {
                            type: 'object',
                            properties: {
                                fiscalDayNumber: { type: 'string' },
                                fiscalDate: { type: 'string' },
                                totalUnprocessed: { type: 'integer', example: 5 },
                                totalAmount: { type: 'number', example: 5050.00 },
                            },
                        },
                    },
                },
                UnProcessedTransactionsResponse: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Success' },
                        Data: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                pageSize: { type: 'integer', example: 50 },
                                totalRecords: { type: 'integer', example: 125 },
                                totalPages: { type: 'integer', example: 3 },
                                transactions: {
                                    type: 'array',
                                    items: { type: 'object', description: 'Unprocessed transaction details' },
                                },
                            },
                        },
                    },
                },
                ClearTransactionsResponse: {
                    type: 'object',
                    properties: {
                        Code: { type: 'string', example: '1' },
                        Message: { type: 'string', example: 'Successfully cleared unprocessed transactions' },
                        Data: {
                            type: 'object',
                            properties: {
                                clearedCount: { type: 'integer', example: 15 },
                                fiscalDayNumber: { type: 'string' },
                                fiscalDate: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        paths: {
            '/auth/login': {
                post: {
                    summary: 'Login',
                    tags: ['Auth'],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
                    },
                    responses: {
                        200: {
                            description: 'Logged in successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } },
                        },
                        401: { description: 'Invalid credentials' },
                    },
                },
            },
            '/auth/user': {
                get: {
                    summary: 'Get Current User',
                    tags: ['Auth'],
                    security: [{ cookieAuth: [] }],
                    responses: {
                        200: {
                            description: 'Current user session',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } },
                        },
                        401: { description: 'Not authenticated' },
                    },
                },
            },
            '/companies/{companyId}/invoices': {
                get: {
                    summary: 'List Company Invoices',
                    tags: ['Invoices'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'companyId', required: true, schema: { type: 'integer' } }
                    ],
                    responses: {
                        200: {
                            description: 'List of invoices',
                            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } },
                        },
                    },
                },
                post: {
                    summary: 'Create Invoice',
                    tags: ['Invoices'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'companyId', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } },
                    },
                    responses: {
                        201: { description: 'Invoice created' },
                    },
                }
            },
            '/invoices/{id}': {
                get: {
                    summary: 'Get Invoice Details',
                    tags: ['Invoices'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
                    ],
                    responses: {
                        200: {
                            description: 'Invoice details',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } },
                        },
                        404: { description: 'Invoice not found' },
                    },
                },
            },
            '/invoices/{id}/fiscalize': {
                post: {
                    summary: 'Fiscalize an Invoice',
                    description: 'Submits an existing invoice to the ZIMRA FDMS for fiscalization. Signs the receipt and generates a QR code.',
                    tags: ['Invoices', 'ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Invoice ID' },
                    ],
                    responses: {
                        200: {
                            description: 'Invoice successfully fiscalized',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/FiscalizeInvoiceResponse' } } },
                        },
                        404: { description: 'Invoice or Company not found' },
                        400: { description: 'Company not registered or validation specific error' },
                        500: { description: 'Fiscalization failed' },
                    },
                },
            },
            '/companies/{companyId}/customers': {
                get: {
                    summary: 'List Customers',
                    tags: ['Customers'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'companyId', required: true, schema: { type: 'integer' } }
                    ],
                    responses: {
                        200: {
                            description: 'List of customers',
                            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } },
                        },
                    },
                },
                post: {
                    summary: 'Create Customer',
                    tags: ['Customers'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'companyId', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } },
                    },
                    responses: {
                        201: { description: 'Customer created' },
                    },
                }
            },
            '/companies/{companyId}/products': {
                get: {
                    summary: 'List Products',
                    tags: ['Products'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'companyId', required: true, schema: { type: 'integer' } }
                    ],
                    responses: {
                        200: {
                            description: 'List of products',
                            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } },
                        },
                    },
                },
                post: {
                    summary: 'Create Product',
                    tags: ['Products'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'companyId', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
                    },
                    responses: {
                        201: { description: 'Product created' },
                    },
                }
            },
            '/companies/{id}/zimra/register': {
                post: {
                    summary: 'Register a ZIMRA Device',
                    description: 'Registers a physical fiscal device with the ZIMRA FDMS servers using the provided activation key and serial number.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/ZimraRegistrationRequest' } } },
                    },
                    responses: {
                        200: {
                            description: 'Device successfully registered',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ZimraRegistrationResponse' } } },
                        },
                        400: { description: 'Missing required fields or invalid data' },
                        404: { description: 'Company not found' },
                        500: { description: 'Registration failed' },
                    },
                },
            },
            '/companies/{id}/zimra/open-day': {
                post: {
                    summary: 'Open Fiscal Day',
                    description: 'Opens a new fiscal day on the ZIMRA device. Required before any fiscalization can occur. Used to start a Z-Report cycle.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    responses: {
                        200: {
                            description: 'Fiscal day opened successfully',
                            content: { 'application/json': { schema: { type: 'object', properties: { fiscalDayNo: { type: 'integer' }, fiscalDayOpened: { type: 'string', format: 'date-time' } } } } },
                        },
                        400: { description: 'Company not registered or fiscal day already open' },
                        500: { description: 'Failed to open fiscal day' },
                    },
                },
            },
            '/companies/{id}/zimra/close-day': {
                post: {
                    summary: 'Close Fiscal Day (Z-Report)',
                    description: 'Closes the current fiscal day. This ACTION Generates the Z-Report for the day. Submits fiscal counters and generates signatures.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    responses: {
                        200: {
                            description: 'Fiscal day closed successfully (Z-Report Generated)',
                            content: { 'application/json': { schema: { type: 'object', properties: { fiscalDayNo: { type: 'integer' }, fiscalDayClosed: { type: 'string', format: 'date-time' }, fiscalDayServerSignature: { type: 'object' } } } } },
                        },
                        400: { description: 'No open fiscal day or validation failed' },
                        500: { description: 'Failed to close fiscal day' },
                    },
                },
            },
            '/companies/{id}/zimra/ping': {
                post: {
                    summary: 'Ping ZIMRA Device',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    responses: {
                        200: {
                            description: 'Ping successful',
                            content: { 'application/json': { schema: { type: 'object', properties: { reportingFrequency: { type: 'integer' }, operationID: { type: 'string' } } } } },
                        },
                    },
                },
            },
            '/companies/{id}/zimra/status': {
                get: {
                    summary: 'Get ZIMRA Device Status (X-Report)',
                    description: 'Retrieves the current status of the ZIMRA device including fiscal day status and counters. Acts as an X-Report (Current Status read).',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    responses: {
                        200: {
                            description: 'Status retrieved successfully',
                            content: { 'application/json': { schema: { type: 'object', properties: { fiscalDayStatus: { type: 'string', example: 'FiscalDayOpened' }, lastReceiptGlobalNo: { type: 'integer' }, lastFiscalDayNo: { type: 'integer' } } } } },
                        },
                    },
                },
            },
            '/companies/{id}/zimra/logs': {
                get: {
                    summary: 'Get ZIMRA Transaction Logs',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'limit', schema: { type: 'integer', default: 100 }, description: 'Maximum number of logs to return' },
                    ],
                    responses: {
                        200: {
                            description: 'Logs retrieved successfully',
                            content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } },
                        },
                    },
                },
            },
            // RevMax/ZIMRA API Endpoints
            '/api/zimra/device-details': {
                get: {
                    summary: 'Get Device Card Details (RevMax: GetCardDetails)',
                    description: 'Returns device registration details including TIN, BPN, VAT, company name, address, and serial number.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    responses: {
                        200: {
                            description: 'Device details retrieved successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceCardDetails' } } },
                        },
                        404: { description: 'Device not found or not registered' },
                    },
                },
            },
            '/api/companies/{id}/zimra/device-status': {
                get: {
                    summary: 'Get Device Status (RevMax: GetDeviceStatus)',
                    description: 'Returns current fiscal day status (Open/Closed), receipt counters, and operation ID.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    responses: {
                        200: {
                            description: 'Device status retrieved successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceStatusResponse' } } },
                        },
                    },
                },
            },
            '/api/companies/{id}/zimra/transact': {
                post: {
                    summary: 'Create Transaction (RevMax: TransactM)',
                    description: 'Create and fiscalize an invoice, credit note, or debit note. Accepts XML format for line items and currencies.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/TransactMRequest' } } },
                    },
                    responses: {
                        200: {
                            description: 'Transaction created and fiscalized successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/TransactionResponse' } } },
                        },
                        400: { description: 'Invalid request data or validation error' },
                        500: { description: 'Fiscalization failed' },
                    },
                },
            },
            '/api/companies/{id}/zimra/transact-ext': {
                post: {
                    summary: 'Create Transaction Extended (RevMax: TransactMExt)',
                    description: 'Enhanced transaction creation with granular address fields and support for cross-device credit note references.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                    ],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/TransactMExtRequest' } } },
                    },
                    responses: {
                        200: {
                            description: 'Transaction created successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/TransactionResponse' } } },
                        },
                        400: { description: 'Invalid request data' },
                        500: { description: 'Fiscalization failed' },
                    },
                },
            },
            '/api/companies/{id}/zimra/z-report': {
                post: {
                    summary: 'Z-Report - Open/Close Fiscal Day (RevMax: ZReport)',
                    description: 'Unified endpoint for opening or closing fiscal day. Query parameter "action" determines operation: "open" or "close".',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'action', required: true, schema: { type: 'string', enum: ['open', 'close'] }, description: 'Action to perform: open or close fiscal day' },
                    ],
                    responses: {
                        200: {
                            description: 'Z-Report generated successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ZReportResponse' } } },
                        },
                        400: { description: 'Invalid action or fiscal day already open/closed' },
                        500: { description: 'Failed to open/close fiscal day' },
                    },
                },
            },
            '/api/companies/{id}/zimra/transactions/{invoiceNumber}': {
                get: {
                    summary: 'Get Transaction by Invoice Number (RevMax: GetTransaction)',
                    description: 'Retrieves complete transaction details for a specific invoice number including verification code and QR data.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'path', name: 'invoiceNumber', required: true, schema: { type: 'string' }, description: 'Invoice Number' },
                    ],
                    responses: {
                        200: {
                            description: 'Transaction retrieved successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/GetTransactionResponse' } } },
                        },
                        404: { description: 'Transaction not found' },
                    },
                },
            },
            '/api/companies/{id}/zimra/transactions/unprocessed/summary': {
                get: {
                    summary: 'Get Unprocessed Transactions Summary (RevMax: GetUnProcessedTransactionSummary)',
                    description: 'Returns summary of unprocessed/failed transactions for a specific fiscal day or date.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'fiscalDayNumber', schema: { type: 'string' }, description: 'Fiscal day number (use fiscalDayNumber OR fiscalDate, not both)' },
                        { in: 'query', name: 'fiscalDate', schema: { type: 'string', format: 'date' }, description: 'Fiscal date (YYYY-MM-DD format)' },
                    ],
                    responses: {
                        200: {
                            description: 'Summary retrieved successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/UnProcessedTransactionSummary' } } },
                        },
                        400: { description: 'Invalid parameters' },
                    },
                },
            },
            '/api/companies/{id}/zimra/transactions/unprocessed': {
                get: {
                    summary: 'Get Unprocessed Transactions (RevMax: GetUnProcessedTransactions)',
                    description: 'Returns paginated list of unprocessed transactions for a specific fiscal day.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'fiscalDayNumber', required: true, schema: { type: 'string' }, description: 'Fiscal day number' },
                        { in: 'query', name: 'page', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'Page number' },
                        { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 50, maximum: 1000 }, description: 'Records per page' },
                    ],
                    responses: {
                        200: {
                            description: 'Transactions retrieved successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/UnProcessedTransactionsResponse' } } },
                        },
                    },
                },
                delete: {
                    summary: 'Clear Unprocessed Transactions (RevMax: ClearUnprocessedTransactions)',
                    description: 'Soft deletes all unprocessed transactions for a specific fiscal day. Includes safety checks - only clears if newer fiscal day exists.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'fiscalDayNumber', required: true, schema: { type: 'string' }, description: 'Fiscal day number to clear' },
                    ],
                    responses: {
                        200: {
                            description: 'Transactions cleared successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ClearTransactionsResponse' } } },
                        },
                        400: { description: 'Safety check failed - no newer fiscal day exists' },
                    },
                },
            },
            '/api/companies/{id}/zimra/transactions/unprocessed/by-date': {
                get: {
                    summary: 'Get Unprocessed Transactions by Date (RevMax: GetUnProcessedTransactionsByDate)',
                    description: 'Returns paginated list of unprocessed transactions filtered by fiscal date.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'fiscalDate', required: true, schema: { type: 'string', format: 'date' }, description: 'Fiscal date (YYYY-MM-DD)' },
                        { in: 'query', name: 'page', schema: { type: 'integer', default: 1, minimum: 1 }, description: 'Page number' },
                        { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 50, maximum: 1000 }, description: 'Records per page' },
                    ],
                    responses: {
                        200: {
                            description: 'Transactions retrieved successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/UnProcessedTransactionsResponse' } } },
                        },
                    },
                },
                delete: {
                    summary: 'Clear Unprocessed Transactions by Date (RevMax: ClearUnprocessedTransactionsByDate)',
                    description: 'Soft deletes all unprocessed transactions for a specific fiscal date with safety checks.',
                    tags: ['ZIMRA - RevMax API'],
                    security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
                    parameters: [
                        { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'Company ID' },
                        { in: 'query', name: 'fiscalDate', required: true, schema: { type: 'string', format: 'date' }, description: 'Fiscal date to clear (YYYY-MM-DD)' },
                    ],
                    responses: {
                        200: {
                            description: 'Transactions cleared successfully',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/ClearTransactionsResponse' } } },
                        },
                        400: { description: 'Safety check failed' },
                    },
                },
            },
        },
    },
    apis: ['./server/routes.ts'], // Path to the API docs
};

export function setupSwagger(app: Express) {
    const specs = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log('Swagger UI available at /api-docs');
}
