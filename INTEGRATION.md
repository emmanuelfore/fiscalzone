# API Integration Guide

Complete guide for integrating external systems with the ZIMRA Fiscalization SaaS API.

## Quick Start

**Base URL**: `https://your-saas-domain.com/api`  
**Authentication**: API Key (Bearer token)

### 1. Get Your API Key

Log into your dashboard and navigate to **Settings → API Keys** to generate your key.

```bash
# Your API key will look like:
sk_test_a1b2c3d4...  # Test environment
sk_live_x9y8z7w6... # Production environment
```

> ⚠️ **Important**: Store your API key securely. It won't be shown again after generation.

## Authentication

All API requests require authentication via the `Authorization` header:

```bash
Authorization: Bearer sk_live_your_api_key_here
```

## Core Endpoints

### 1. Get Device Details

Retrieve your device registration information.

**Endpoint**: `GET /api/zimra/device-details`

```bash
curl https://your-saas-domain.com/api/zimra/device-details \
  -H "Authorization: Bearer sk_live_..."
```

**Response**:
```json
{
  "Code": "1",
  "Message": "Success",
  "DeviceID": "1234567890",
  "DeviceSerialNumber": "SW12345",
  "FiscalDay": "61",
  "Data": {
    "TIN": "1234567890",
    "BPN": "200027482",
    "VAT": "123456789",
    "COMPANYNAME": "ABC Trading Ltd",
    "ADDRESS": "14 Arundel Road, Harare",
    "REGISTRATIONNUMBER": "1234567890",
    "SERIALNUMBER": "SW12345"
  }
}
```

---

### 2. Get Device Status

Check the current fiscal day status and counters.

**Endpoint**: `GET /api/companies/{id}/zimra/device-status`

```bash
curl https://your-saas-domain.com/api/companies/1/zimra/device-status \
  -H "Authorization: Bearer sk_live_..."
```

**Response**:
```json
{
  "Code": "1",
  "Message": "Success",
  "DeviceID": "1234567890",
  "FiscalDay": "61",
  "Data": {
    "fiscalDayStatus": "FiscalDayOpened",
    "lastReceiptGlobalNo": 444,
    "lastFiscalDayNo": 61,
    "operationID": "0HN1OVTDITH0C:00000001"
  }
}
```

---

### 3. Create Transaction (Fiscalize Invoice)

Create and fiscalize an invoice, credit note, or debit note.

**Endpoint**: `POST /api/companies/{id}/zimra/transact`

**Request Body**:
```json
{
  "CURRENCY": "USD",
  "CUSTOMEREMAIL": "customer@example.com",
  "INVOICENUMBER": "INV-2024-001",
  "CUSTOMERNAME": "John Doe",
  "CUSTOMERVATNUMBER": "1234567890",
  "CUSTOMERADDRESS": "14 Arundel Road, Harare",
  "CUSTOMERTELEPHONENUMBER": "+263771234567",
  "CUSTOMERTIN": "2000000000",
  "INVOICEAMOUNT": "1150.00",
  "INVOICETAXAMOUNT": "150.00",
  "INVOICEFLAG": "01",
  "ORIGINALINVOICENUMBER": "",
  "INVOICECOMMENT": "",
  "ITEMSXML": "<ITEMS><ITEM><HH>1</HH><ITEMCODE>PROD001</ITEMCODE><ITEMNAME1>Product Name</ITEMNAME1><ITEMNAME2>Description</ITEMNAME2><QTY>1</QTY><PRICE>1000.00</PRICE><AMT>1000.00</AMT><TAX>150.00</TAX><TAXR>15</TAXR></ITEM></ITEMS>",
  "CURRENCIES": "<CurrenciesReceived><Currency><Name>USD</Name><Amount>1150.00</Amount><Rate>1</Rate></Currency></CurrenciesReceived>"
}
```

**Field Descriptions**:
- `INVOICEFLAG`: `"01"` = Invoice, `"02"` = Credit Note, `"03"` = Debit Note
- `ITEMSXML`: Line items in XML format (required)
- `CURRENCIES`: Payment currencies in XML format (required)
- `ORIGINALINVOICENUMBER`: Required for credit/debit notes

**Example Request**:
```bash
curl -X POST https://your-saas-domain.com/api/companies/1/zimra/transact \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "CURRENCY": "USD",
    "INVOICENUMBER": "INV-001",
    "CUSTOMERNAME": "John Doe",
    "CUSTOMEREMAIL": "john@example.com",
    "INVOICEAMOUNT": "115.00",
    "INVOICETAXAMOUNT": "15.00",
    "INVOICEFLAG": "01",
    "ITEMSXML": "<ITEMS><ITEM><HH>1</HH><ITEMNAME1>Product</ITEMNAME1><QTY>1</QTY><PRICE>100.00</PRICE><AMT>100.00</AMT><TAXR>15</TAXR></ITEM></ITEMS>",
    "CURRENCIES": "<CurrenciesReceived><Currency><Name>USD</Name><Amount>115.00</Amount><Rate>1</Rate></Currency></CurrenciesReceived>"
  }'
```

**Response**:
```json
{
  "Code": "1",
  "Message": "Upload Success - Transacted to Card",
  "QRcode": "https://fdmstest.zimra.co.zw/00000000691008202300000001759AD9E75F2222AEC7",
  "VerificationCode": "9AD9-E75F-2222-AEC7",
  "DeviceID": "1234567890",
  "DeviceSerialNumber": "SW12345",
  "FiscalDay": "61",
  "Data": {
    "receipt": {
      /* Full ZIMRA receipt data */
    }
  }
}
```

---

### 4. Z-Report (Open/Close Fiscal Day)

Open or close fiscal day operations.

**Endpoint**: `POST /api/companies/{id}/zimra/z-report?action={open|close}`

**Open Fiscal Day**:
```bash
curl -X POST "https://your-saas-domain.com/api/companies/1/zimra/z-report?action=open" \
  -H "Authorization: Bearer sk_live_..."
```

**Close Fiscal Day**:
```bash
curl -X POST "https://your-saas-domain.com/api/companies/1/zimra/z-report?action=close" \
  -H "Authorization: Bearer sk_live_..."
```

**Response**:
```json
{
  "Code": "1",
  "Message": "Success: Fiscal Day Opened",
  "DeviceID": "1234567890",
  "FiscalDay": "62",
  "Data": {
    "fiscalDayNo": 62,
    "fiscalDayOpened": "2024-01-15T08:00:00"
  }
}
```

---

### 5. Get Transaction Details

Retrieve details of a specific transaction by invoice number.

**Endpoint**: `GET /api/companies/{id}/zimra/transactions/{invoiceNumber}`

```bash
curl https://your-saas-domain.com/api/companies/1/zimra/transactions/INV-001 \
  -H "Authorization: Bearer sk_live_..."
```

**Response**:
```json
{
  "Code": "1",
  "Message": "Success",
  "Data": {
    "invoiceNumber": "INV-001",
    "receiptData": { /* Full receipt */ },
    "qrCode": "https://fdms.zimra.co.zw/...",
    "verificationCode": "9AD9-E75F-2222-AEC7",
    "fiscalDayNo": 61,
    "receiptGlobalNo": 445
  }
}
```

---

## Response Codes

All endpoints return a `Code` field:

- `"1"` = Success
- `"0"` = Error

Standard HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `500` - Server Error

## Error Handling

```json
{
  "Code": "0",
  "Message": "Invalid request data",
  "DeviceID": "1234567890",
  "Data": {
    "errors": [
      "INVOICENUMBER is required",
      "ITEMSXML must be valid XML"
    ]
  }
}
```

## Best Practices

### 1. API Key Security
- ✅ Store API keys in environment variables
- ✅ Never commit keys to version control
- ✅ Use test keys (`sk_test_...`) for development
- ✅ Use production keys (`sk_live_...`) only in production
- ✅ Rotate keys regularly

### 2. Error Handling
```javascript
try {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  
  if (result.Code === "1") {
    // Success
    console.log("QR Code:", result.QRcode);
    console.log("Verification:", result.VerificationCode);
  } else {
    // Error
    console.error("Error:", result.Message);
  }
} catch (error) {
  console.error("Network error:", error);
}
```

### 3. Rate Limiting
- Maximum 100 requests per minute per company
- Implement exponential backoff for retries
- Cache device details locally

### 4. Testing
- Always test in test environment first (`sk_test_...` keys)
- Verify QR codes scan correctly
- Test credit note references

## Code Examples

### Node.js/TypeScript
```typescript
import axios from 'axios';

const API_KEY = process.env.ZIMRA_API_KEY;
const BASE_URL = 'https://your-saas-domain.com/api';

async function fiscalizeInvoice(companyId: number, invoiceData: any) {
  try {
    const response = await axios.post(
      `${BASE_URL}/companies/${companyId}/zimra/transact`,
      invoiceData,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.Code === "1") {
      return {
        success: true,
        qrCode: response.data.QRcode,
        verificationCode: response.data.VerificationCode
      };
    } else {
      throw new Error(response.data.Message);
    }
  } catch (error) {
    console.error('Fiscalization failed:', error);
    throw error;
  }
}
```

### Python
```python
import requests
import os

API_KEY = os.getenv('ZIMRA_API_KEY')
BASE_URL = 'https://your-saas-domain.com/api'

def fiscalize_invoice(company_id, invoice_data):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{BASE_URL}/companies/{company_id}/zimra/transact',
        json=invoice_data,
        headers=headers
    )
    
    result = response.json()
    
    if result['Code'] == '1':
        return {
            'success': True,
            'qr_code': result['QRcode'],
            'verification_code': result['VerificationCode']
        }
    else:
        raise Exception(result['Message'])
```

### PHP
```php
<?php
$apiKey = getenv('ZIMRA_API_KEY');
$baseUrl = 'https://your-saas-domain.com/api';

function fiscalizeInvoice($companyId, $invoiceData) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init("$baseUrl/companies/$companyId/zimra/transact");
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $apiKey",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($invoiceData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    if ($result['Code'] === '1') {
        return [
            'success' => true,
            'qr_code' => $result['QRcode'],
            'verification_code' => $result['VerificationCode']
        ];
    } else {
        throw new Exception($result['Message']);
    }
}
?>
```

## Support

For issues or questions:
- Email: support@your-saas-domain.com
- Documentation: https://docs.your-saas-domain.com
- Status Page: https://status.your-saas-domain.com

## Changelog

### Version 1.0 (Current)
- Initial API release
- Full RevMax endpoint support
- Test and production environments
- API key authentication
