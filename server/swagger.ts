
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
            '/companies/{id}/zimra/register': {
                post: {
                    summary: 'Register a ZIMRA Device',
                    description: 'Registers a physical fiscal device with the ZIMRA FDMS servers using the provided activation key and serial number.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Company ID',
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ZimraRegistrationRequest' },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Device successfully registered',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ZimraRegistrationResponse' },
                                },
                            },
                        },
                        400: { description: 'Missing required fields or invalid data' },
                        404: { description: 'Company not found' },
                        500: { description: 'Registration failed' },
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
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Invoice ID',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Invoice successfully fiscalized',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/FiscalizeInvoiceResponse' },
                                },
                            },
                        },
                        404: { description: 'Invoice or Company not found' },
                        400: { description: 'Company not registered or validation specific error' },
                        500: { description: 'Fiscalization failed' },
                    },
                },
            },
            '/companies/{id}/zimra/open-day': {
                post: {
                    summary: 'Open Fiscal Day',
                    description: 'Opens a new fiscal day on the ZIMRA device. Required before any fiscalization can occur.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Company ID',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Fiscal day opened successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            fiscalDayNo: { type: 'integer' },
                                            fiscalDayOpened: { type: 'string', format: 'date-time' },
                                        },
                                    },
                                },
                            },
                        },
                        400: { description: 'Company not registered or fiscal day already open' },
                        500: { description: 'Failed to open fiscal day' },
                    },
                },
            },
            '/companies/{id}/zimra/close-day': {
                post: {
                    summary: 'Close Fiscal Day',
                    description: 'Closes the current fiscal day on the ZIMRA device. Submits fiscal counters and generates signatures.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Company ID',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Fiscal day closed successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            fiscalDayNo: { type: 'integer' },
                                            fiscalDayClosed: { type: 'string', format: 'date-time' },
                                            fiscalDayServerSignature: { type: 'object' },
                                        },
                                    },
                                },
                            },
                        },
                        400: { description: 'No open fiscal day or validation failed' },
                        500: { description: 'Failed to close fiscal day' },
                    },
                },
            },
            '/companies/{id}/zimra/ping': {
                post: {
                    summary: 'Ping ZIMRA Device',
                    description: 'Sends a ping request to the ZIMRA FDMS to check connectivity and get reporting frequency.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Company ID',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Ping successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            reportingFrequency: { type: 'integer', description: 'Minutes between pings' },
                                            operationID: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                        400: { description: 'Company not registered' },
                        500: { description: 'Ping failed' },
                    },
                },
            },
            '/companies/{id}/zimra/status': {
                get: {
                    summary: 'Get ZIMRA Device Status',
                    description: 'Retrieves the current status of the ZIMRA device including fiscal day status and counters.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Company ID',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Status retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            fiscalDayStatus: { type: 'string', example: 'FiscalDayOpened' },
                                            lastReceiptGlobalNo: { type: 'integer' },
                                            lastFiscalDayNo: { type: 'integer' },
                                            fiscalDayClosingErrorCode: { type: 'string', nullable: true },
                                        },
                                    },
                                },
                            },
                        },
                        400: { description: 'Company not registered' },
                        500: { description: 'Failed to get status' },
                    },
                },
            },
            '/companies/{id}/zimra/logs': {
                get: {
                    summary: 'Get ZIMRA Transaction Logs',
                    description: 'Retrieves transaction logs of all ZIMRA API interactions for a company.',
                    tags: ['ZIMRA'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        {
                            in: 'path',
                            name: 'id',
                            required: true,
                            schema: { type: 'integer' },
                            description: 'Company ID',
                        },
                        {
                            in: 'query',
                            name: 'limit',
                            schema: { type: 'integer', default: 100 },
                            description: 'Maximum number of logs to return',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Logs retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'integer' },
                                                companyId: { type: 'integer' },
                                                endpoint: { type: 'string' },
                                                requestPayload: { type: 'object' },
                                                responsePayload: { type: 'object' },
                                                statusCode: { type: 'integer' },
                                                errorMessage: { type: 'string', nullable: true },
                                                createdAt: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        500: { description: 'Failed to fetch logs' },
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
