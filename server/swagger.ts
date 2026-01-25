
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
        },
    },
    apis: ['./server/routes.ts'], // Path to the API docs
};

export function setupSwagger(app: Express) {
    const specs = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log('Swagger UI available at /api-docs');
}
