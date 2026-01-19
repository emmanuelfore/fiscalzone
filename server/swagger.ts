
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
        },
    },
    apis: ['./server/routes.ts'], // Path to the API docs
};

export function setupSwagger(app: Express) {
    const specs = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log('Swagger UI available at /api-docs');
}
