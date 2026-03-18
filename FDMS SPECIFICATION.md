Select a definition

Device-v1
Fiscal backend FiscalDeviceApi Build:1.0.0.0
 1.0 
OAS 3.0
/swagger/Device-v1/swagger.json
Device
All methods except closeDay are synchronous. closeDay method returns response about accepted request synchronously, however processing of information is done asynchronously. Fiscal Device Gateway uses mutual TLS authentication (https://en.wikipedia.org/wiki/Mutual_authentication) to authenticate fiscal device using fiscal device certificate. Fiscal device certificate is validated against issuing certificate to allow or deny access to API endpoints. After authentication provided fiscal device certificate is checked against issued certificate (see registerDevice and issueCertificate methods for fiscal device certificate issuing) to check if the fiscal device certificate was issued to calling device (by method parameter deviceId) and the fiscal device certificate was not revoked



GET
/Device/v1/{deviceID}/GetConfig

Endpoint is used to retrieve taxpayers and device information and configuration.

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
deviceID
DeviceModelName
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Responses
Code	Description	Links
200	
Success

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operationID": "0HMPH89RT4FP8:00000004",
  "taxPayerName": "Nienow, Hara and Schinner",
  "taxPayerTIN": "3796605707",
  "vatNumber": "3899488439",
  "deviceSerialNo": "SN-1",
  "deviceBranchName": "Shoes",
  "deviceBranchAddress": {
    "province": "Harare",
    "street": "Torey Lakes",
    "houseNo": "566",
    "city": "Harare"
  },
  "deviceBranchContacts": {
    "phoneNo": "(320) 238-4248",
    "email": "Leland_Gutmann@yahoo.com"
  },
  "deviceOperatingMode": "Online",
  "taxPayerDayMaxHrs": 24,
  "applicableTaxes": [
    {
      "taxPercent": 15,
      "taxName": "15%"
    },
    {
      "taxPercent": 0,
      "taxName": "0%"
    },
    {
      "taxName": "exempt"
    }
  ],
  "certificateValidTill": "2026-03-30T17:15:40",
  "qrUrl": "www.qrUrl.com",
  "taxpayerDayEndNotificationHrs": 20
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
400	
Bad Request

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errors": {
    "additionalProp1": [
      "string"
    ],
    "additionalProp2": [
      "string"
    ],
    "additionalProp3": [
      "string"
    ]
  },
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
401	
Device certificate expired.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errorCode": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
500	
Server encountered temporary issues.

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/500",
  "title": "Server error",
  "status": 500,
  "operationID": "0HMPDRRQL1C0G:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links

GET
/Device/v1/{deviceID}/GetStatus

Endpoint is used to get fiscal day status.

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
deviceID
DeviceModelName
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Responses
Code	Description	Links
200	
Success

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operationID": "0HMPH8CBL0I62:00000001",
  "fiscalDayStatus": "FiscalDayClosed",
  "fiscalDayReconciliationMode": "Auto",
  "fiscalDayServerSignature": {
    "certificateThumbprint": "b785a0b4d8a734a55ba595d143b4cf72834cd88d",
    "hash": "//To59fLHvuoRe2slUpN2grJu5adaodOW6kW1OYvf/c=",
    "signature": "YyXTSizBBrMjMk4VQL+sCNr+2AC6aQbDAn9JMV2rk3yJ6MDZwie0wqQW3oisNWrMkeZsuAyFSnFkU2A+pKm91sOHVdjeRBebjQgAQQIMTCVIcYrx+BizQ7Ib9iCdsVI+Jel2nThqQiQzfRef6EgtgsaIAN+PV55xSrHvPkIe+Bc="
  },
  "fiscalDayClosed": "2023-03-30T20:15:40",
  "lastFiscalDayNo": 101,
  "lastReceiptGlobalNo": 9931
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
400	
Bad Request

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errors": {
    "additionalProp1": [
      "string"
    ],
    "additionalProp2": [
      "string"
    ],
    "additionalProp3": [
      "string"
    ]
  },
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
401	
Device certificate expired.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errorCode": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
500	
Server encountered temporary issues.

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/500",
  "title": "Server error",
  "status": 500,
  "operationID": "0HMPDRRQL1C0G:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links

POST
/Device/v1/{deviceID}/OpenDay

Endpoint is used to open a new fiscal day. Opening of new fiscal day is possible only when previous fiscal day is successfully closed (fiscal day status is “FiscalDayClosed”).

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
deviceID
DeviceModelName
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Request body

application/json
Example Value
Schema
{
  "fiscalDayNo": 101,
  "fiscalDayOpened": "2023-03-30T18:38:54"
}
Responses
Code	Description	Links
200	
Success

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operationID": "0HMPH9AF0QKKE:00000005",
  "fiscalDayNo": 102
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
400	
Bad Request

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errors": {
    "additionalProp1": [
      "string"
    ],
    "additionalProp2": [
      "string"
    ],
    "additionalProp3": [
      "string"
    ]
  },
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
401	
Device certificate expired.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errorCode": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
500	
Server encountered temporary issues.

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/500",
  "title": "Server error",
  "status": 500,
  "operationID": "0HMPDRRQL1C0G:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links

POST
/Device/v1/{deviceID}/CloseDay

Endpoint is used to initiate fiscal day closure procedure. This method is allowed when fiscal days status is “FiscalDayOpened” or “FiscalDayCloseFailed”. In case fiscal day contains at least one “Grey” or “Red” receipt (as specified Validation errors), Fiscalisation Backend will respond to closeDay request with error (fiscal day will remain opened). Otherwise if fiscal day does not have “Grey” and “Red” receipts, validation of submitted closeDay request will be executed. In case of fiscal day validation fails (as specified below in “Validation rules”), fiscal day remains opened and its status is changed to “FiscalDayCloseFailed”.

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
deviceID
DeviceModelName
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Request body

application/json
Example Value
Schema
{
  "fiscalDayNo": 101,
  "fiscalDayCounters": [
    {
      "fiscalCounterType": "SaleByTax",
      "fiscalCounterCurrency": "str",
      "fiscalCounterTaxPercent": 0,
      "fiscalCounterTaxID": 0,
      "fiscalCounterMoneyType": "Cash",
      "fiscalCounterValue": 0
    }
  ],
  "fiscalDayDeviceSignature": {
    "hash": "string",
    "signature": "string"
  },
  "receiptCounter": 0
}
Responses
Code	Description	Links
200	
Success

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operationID": "0HMPH9AF0QKKE:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
400	
Bad Request

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errors": {
    "additionalProp1": [
      "string"
    ],
    "additionalProp2": [
      "string"
    ],
    "additionalProp3": [
      "string"
    ]
  },
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
401	
Device certificate expired.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errorCode": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
500	
Server encountered temporary issues.

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/500",
  "title": "Server error",
  "status": 500,
  "operationID": "0HMPDRRQL1C0G:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links

POST
/Device/v1/{deviceID}/IssueCertificate

Endpoint is used to renew certificate before the expiration of the current certificate. It is recommended to renew certificate a month before its expiration. Certificate reissue can be done at any time. It does not depend on fiscal day status, however it is recommended to be done before opening a new fiscal day.

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
deviceID
DeviceModelName
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Request body

application/json
Example Value
Schema
{
  "certificateRequest": "-----BEGIN CERTIFICATE REQUEST-----\\nMIHYMIGAAgEAMB4xHDAaBgNVBAMME1pSQi1lVkZELTAwMDAwMDAwNDIwWTATBgcq\\nhkjOPQIBBggqhkjOPQMBBwNCAAT7v3DvY7pRg4lz2Z87wSMwSX27KwlpYnSRV6WU\\niPjpq2XsUAbg2lhUN7q3mlNJaUzqoKPmop5qURIpqUydXfapoAAwCgYIKoZIzj0E\\nAwIDRwAwRAIgLMEJQDh18bUE9waT2UXzP0+8FcGukpcIegMxd1A4JaQCIAZkzmEH\\ne0aaZ2jIcZArZo+rWzI4IwnSXtJqXLrpGUML\\n-----END CERTIFICATE REQUEST-----"
}
Responses
Code	Description	Links
200	
Success

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operationID": "0HMPH9AF0QKKE:00000005",
  "certificate": "-----BEGIN CERTIFICATE-----\nMIIC6TCCAdGgAwIBAgIFAKsSzWowDQYJKoZIhvcNAQELBQAwZDELMAkGA1UEBhMC\nTFQxETAPBgNVBAoMCEdvb2QgTHRkMScwJQYDVQQLDB5Hb29kIEx0ZCBDZXJ0aWZp\nY2F0ZSBBdXRob3JpdHkxGTAXBgNVBAMMEEdvb2QgTHRkIFJvb3QgQ0EwHhcNMTkx\nMDAzMTU1NzA1WhcNMjAxMDEyMTU1NzA1WjBfMQswCQYDVQQGEwJUWjERMA8GA1UE\nCAwIWmFuemliYXIxHzAdBgNVBAoMFlphbnppYmFyIFJldmVudWUgQm9hcmQxHDAa\nBgNVBAMME1pSQi1lVkZELTAwMDAwMDAwNDIwWTATBgcqhkjOPQIBBggqhkjOPQMB\nBwNCAAT7v3DvY7pRg4lz2Z87wSMwSX27KwlpYnSRV6WUiPjpq2XsUAbg2lhUN7q3\nmlNJaUzqoKPmop5qURIpqUydXfapo3IwcDAJBgNVHRMEAjAAMB8GA1UdIwQYMBaA\nFK1RXHm1plvaintqlWaXDs1X3LX+MB0GA1UdDgQWBBRqr96XrCUbuwCQawxO0//n\nTOCoNTAOBgNVHQ8BAf8EBAMCBeAwEwYDVR0lBAwwCgYIKwYBBQUHAwIwDQYJKoZI\nhvcNAQELBQADggEBANr1Wk1cVZB96yobFgK3rQQv9oXW+Jle7Jh36J2o4wSSB+RH\nlfMojDrqKVQCLrFDcF+8JIA3RTRKdduIXgBAr13xQ8JkHd1/o23yN6a2DaYgh0wr\nDrndlR6y1yG0vQuurJ3IgXmC0ldM5+VhalgmoCKFV9JsUD+GhOyJ6NWlc0SqvJCs\n3RZLYwZ4MNViPbRy0Kbp0ufY1zTbh02Gw9aVfFzUwL8GS00iMb4MnSav1xur7wQh\nBoF3PpNvu003P7f1eVJ62qVD2LWWntfn0mL1aRmDe2wpMQKAKhxto+sDb2mfJ6G6\nPFtwMHe7BUfiwTzGYqav21h1w/amPkxNVQ7Li4M=\n-----END CERTIFICATE-----"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
400	
Bad Request

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errors": {
    "additionalProp1": [
      "string"
    ],
    "additionalProp2": [
      "string"
    ],
    "additionalProp3": [
      "string"
    ]
  },
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
401	
Device certificate expired.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errorCode": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
500	
Server encountered temporary issues.

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/500",
  "title": "Server error",
  "status": 500,
  "operationID": "0HMPDRRQL1C0G:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links

POST
/Device/v1/{deviceID}/SubmitReceipt

Endpoint is used to submit a receipt to Fiscalisation Backend in online mode and get a Fiscalisation Backend signature for it (signature is not a QR code, it is an acknowledgement of Fiscalisation Backend about received receipt). Receipt can be submitted only when fiscal day status is “FiscalDayOpened” or “FiscalDayCloseFailed” and fiscal day is opened not earlier than receiptDate – taxpayerDayMaxHrs. If fiscal day is opened earlier that allowed time, receipt will still be registered, but marked in “Yellow” with validation error RCPT014 (as specified in Validation errors).

In case device tried to close a fiscal day and attempt was unsuccessful, device still have a possibility to submit a new receipt. In case the same receipt (with the same deviceID, receiptGlobalNo and receiptHash) is submitted more than once, Fiscal Device Gateway API will return successful result to fiscal device with the same original receipt receiptID, receiptServerSignature, however different operationID.

Each submitted receipt is validated. Receipt will not be accepted, error will be returned to fiscal device (as specified in Error codes), in these cases:

• fiscal device status is other than “Active”;

• fiscal day status is other than “FiscalDayOpened” or “FiscalDayCloseFailed”;

• receipt message structure is not valid

In case the above mentioned validations have passed, but receipt has other validation issues specified below (described in “Validation rules”), receipt will be accepted and signed, but will be marked as invalid with validation color code assigned (as specified in 7.3. Validation errors).

Each submitted receipt, must increase fiscal day counters as specified in Fiscal counters.

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
deviceID
DeviceModelName
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Request body

application/json
Example Value
Schema
{
  "receipt": {
    "receiptType": "FiscalInvoice",
    "receiptCurrency": "str",
    "receiptCounter": 0,
    "receiptGlobalNo": 0,
    "invoiceNo": "string",
    "buyerData": {
      "buyerRegisterName": "string",
      "buyerTradeName": "string",
      "vatNumber": "stringstr",
      "buyerTIN": "stringstri",
      "buyerContacts": {
        "phoneNo": "string",
        "email": "string"
      },
      "buyerAddress": {
        "province": "string",
        "city": "string",
        "street": "string",
        "houseNo": "string",
        "district": "string"
      }
    },
    "receiptNotes": "string",
    "username": "string",
    "usernameSurname": "string",
    "receiptDate": "2026-01-19T01:51:52.354Z",
    "creditDebitNote": {
      "receiptID": 0,
      "deviceID": 0,
      "receiptGlobalNo": 0,
      "fiscalDayNo": 0
    },
    "receiptLinesTaxInclusive": true,
    "receiptLines": [
      {
        "receiptLineType": "Sale",
        "receiptLineNo": 0,
        "receiptLineHSCode": "string",
        "receiptLineName": "string",
        "receiptLinePrice": 0,
        "receiptLineQuantity": 0,
        "receiptLineTotal": 0,
        "taxCode": "str",
        "taxPercent": 0,
        "taxID": 0
      }
    ],
    "receiptTaxes": [
      {
        "taxCode": "str",
        "taxPercent": 0,
        "taxID": 0,
        "taxAmount": 0,
        "salesAmountWithTax": 0
      }
    ],
    "receiptPayments": [
      {
        "moneyTypeCode": "Cash",
        "paymentAmount": 0
      }
    ],
    "receiptTotal": 0,
    "receiptPrintForm": "Receipt48",
    "receiptDeviceSignature": {
      "hash": "string",
      "signature": "string"
    }
  }
}
Responses
Code	Description	Links
200	
Success

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "receiptID": 600,
  "serverDate": "2023-05-04T16:45:37",
  "receiptServerSignature": {
    "certificateThumbprint": "F9B295CA65BA22B94F6D4B27E48D08BF6CD7F7C8",
    "hash": "8IURjBbdTy2b6EnUzSEHHCjIenorq5TdYSCtuzCVisw=",
    "signature": "gz/JZQVw5Mk7vCTVx02hrZEQS1vAnMIEnwVdl/eouL9SkYbmZFrfQLVtfhPwxM2SCzgrqf9dpuQi1/t9u7T1t5Vvl/vkMW8FLH0u2IReOXLakxFx9TNWu7XH20FqjCJLXOB3NYAiVshAHtYpwPmU9gYCJBTwfhKAjmJaYpIkUvXE+cXKsV4Zxuvm7y25jOGs2RlLExmVw2uT53aRLoLbHdIxaelq8Pgx+YEJQNz9/AniRyjQRdOD5FyQgu00IU9SydrcpkM6xA01fHsNnB53ATb6CdGBAXv88I42n6o8E784CI8wCGWTF6lEoN6sMnLQPqyxY9YQj0ZxcvW5xhC9uA=="
  },
  "operationID": "0HMQCKLK5B38G:00000006"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
400	
Bad Request

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "errors": {
    "additionalProp1": [
      "string"
    ],
    "additionalProp2": [
      "string"
    ],
    "additionalProp3": [
      "string"
    ]
  },
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
401	
Device certificate expired.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "type": "string",
  "title": "string",
  "status": 0,
  "detail": "string",
  "instance": "string",
  "additionalProp1": "string",
  "additionalProp2": "string",
  "additionalProp3": "string"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links
500	
Server encountered temporary issues.

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/500",
  "title": "Server error",
  "status": 500,
  "operationID": "0HMPDRRQL1C0G:00000005"
}
Headers:
Name	Description	Type
operationId	
unique operation id

string
No links

POST
/Device/v1/{deviceID}/Ping


POST
/Device/v1/{deviceID}/SubmitFile
Offline Fiscal device receipts


GET
/Device/v1/{deviceID}/SubmittedFileList
Get submitted files list with applied filters


Schemas
AddressDto{
province	string
maxLength: 100
minLength: 0
nullable: true
city	string
maxLength: 100
minLength: 0
nullable: true
street	string
maxLength: 100
minLength: 0
nullable: true
houseNo	string
maxLength: 250
minLength: 0
nullable: true
district	string
maxLength: 100
minLength: 0
nullable: true
}
ApiProblemDetails{
type	string
nullable: true
title	string
nullable: true
status	integer($int32)
nullable: true
detail	string
nullable: true
instance	string
nullable: true
errorCode	string
nullable: true
}
BuyerAddressDto{
province	string
maxLength: 100
minLength: 0
nullable: true
city	string
maxLength: 100
minLength: 0
nullable: true
street	string
maxLength: 100
minLength: 0
nullable: true
houseNo	string
maxLength: 250
minLength: 0
nullable: true
district	string
maxLength: 100
minLength: 0
nullable: true
}
BuyerContactsDto{
phoneNo	string
maxLength: 20
nullable: true
email	string
maxLength: 100
nullable: true
}
BuyerDto{
buyerRegisterName	string
maxLength: 200
minLength: 0
nullable: true
buyerTradeName	string
maxLength: 200
minLength: 0
nullable: true
vatNumber	string
maxLength: 9
minLength: 9
nullable: true
buyerTIN	string
maxLength: 10
minLength: 10
nullable: true
buyerContacts	{...}
nullable: true
buyerAddress	{
province	[...]
city	[...]
street	[...]
houseNo	[...]
district	[...]
}
nullable: true
}
CloseDayRequest{
fiscalDayNo*	integer($int32)
example: 101
Fiscal day number. Validation rules:

fiscalDayNo must be the same as provided/received fiscalDayNo value in openDay request.
fiscalDayCounters*	[
List of fiscal counters. Zero value counters may not be submitted to Fiscalisation Backend.

FiscalDayCounterDto{...}]
fiscalDayDeviceSignature*	{
description:	
SignatureData structure with SHA256 hash of fiscal day report fields (hash used for signature) and fiscal day report device signature prepared by using device private key. Validation rules:

fiscalDayDeviceSignature must be valid
hash*	[...]
signature*	[...]
}
receiptCounter*	integer($int32)
ReceiptCounter value of last receipt of current fiscal day.

}
CloseDayResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

}
ContactsDto{
phoneNo	string
maxLength: 20
nullable: true
email	string
maxLength: 100
nullable: true
}
CreditDebitNoteDto{
receiptID	integer($int64)
nullable: true
deviceID	integer($int32)
nullable: true
receiptGlobalNo	integer($int32)
nullable: true
fiscalDayNo	integer($int32)
nullable: true
}
DeviceOperatingModestring
Enum:
[ Online, Offline ]
DevicesGetSubmittedFileListRequest{
order	string
Enum:
[ asc, desc ]
offset*	integer($int32)
limit*	integer($int32)
operator	string
Enum:
[ And, Or ]
sort	string
Enum:
[ DeviceId, FileName, FileUploadDate, FileProcessingDate, FileProcessingStatus, FileProcessingError ]
operationID	string
maxLength: 60
minLength: 0
nullable: true
fileUploadedFrom*	string($date-time)
fileUploadedTill*	string($date-time)
}
FileProcessingErrorEnumstring
Enum:
[ IncorrectFileFormat, FileSentForClosedDay, BadCertificateSignature, MissingReceipts, ReceiptsWithValidationErrors, CountersMismatch, FileExceededAllowedWaitingTime, InternalError ]
FileProcessingStatusEnumstring
Enum:
[ InProgress, CompleteSuccessful, FailedWithErrors, WaitingForPreviousFile ]
FiscalCounterTypestring
Enum:
[ SaleByTax, SaleTaxByTax, CreditNoteByTax, CreditNoteTaxByTax, DebitNoteByTax, DebitNoteTaxByTax, BalanceByMoneyType, PayoutByTax, PayoutTaxByTax ]
FiscalDayCounterDto{
fiscalCounterType*	string
Enum:
[ SaleByTax, SaleTaxByTax, CreditNoteByTax, CreditNoteTaxByTax, DebitNoteByTax, DebitNoteTaxByTax, BalanceByMoneyType, PayoutByTax, PayoutTaxByTax ]
fiscalCounterCurrency*	string
maxLength: 3
minLength: 3
fiscalCounterTaxPercent	number($double)
nullable: true
fiscalCounterTaxID	integer($int32)
nullable: true
fiscalCounterMoneyType	string
nullable: true
Enum:
[ Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other ]
fiscalCounterValue*	number($double)
}
FiscalDayDocumentQuantity{
receiptType*	string
example: FiscalInvoice
Type of receipt

Enum:
[ FiscalInvoice, CreditNote, DebitNote ]
receiptCurrency*	string
maxLength: 3
minLength: 3
example: USD
Receipt counter currency (ISO 4217 currency code).

receiptQuantity*	integer($int32)
example: 200
Total quantity of receipts of particular receipt type and currency for fiscal day.

receiptTotalAmount*	number($double)
example: 3500.05
Total receipt amount (including tax) of receipts of particular receipt type and currency for fiscal day.

}
FiscalDayProcessingErrorstring
Enum:
[ BadCertificateSignature, MissingReceipts, ReceiptsWithValidationErrors, CountersMismatch, InternalError ]
FiscalDayReconciliationModestring
Enum:
[ Auto, Manual ]
FiscalDayStatusstring
Enum:
[ FiscalDayClosed, FiscalDayOpened, FiscalDayCloseInitiated, FiscalDayCloseFailed ]
GetConfigResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

taxPayerName*	string
maxLength: 250
minLength: 0
taxPayerTIN*	string
maxLength: 10
minLength: 10
vatNumber	string
maxLength: 9
minLength: 9
nullable: true
deviceSerialNo*	string
maxLength: 20
minLength: 0
deviceBranchName*	string
maxLength: 250
minLength: 0
deviceBranchAddress*	{
province	[...]
city	[...]
street	[...]
houseNo	[...]
district	[...]
}
deviceBranchContacts	{
phoneNo	[...]
email	[...]
}
nullable: true
deviceOperatingMode*	string
Enum:
[ Online, Offline ]
taxPayerDayMaxHrs*	integer($int32)
applicableTaxes*	[Tax{
taxPercent	[...]
taxName*	[...]
validFrom*	[...]
validTill	[...]
taxID*	[...]
}]
certificateValidTill*	string($date-time)
qrUrl*	string
maxLength: 50
minLength: 0
taxpayerDayEndNotificationHrs*	integer($int32)
example: 20
How much time in hours before end of fiscal day device should show notification to salesperson.

}
GetStatusResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

fiscalDayStatus*	string
Enum:
Array [ 4 ]
fiscalDayReconciliationMode	string
nullable: true
Enum:
[ Auto, Manual ]
fiscalDayServerSignature	{
hash*	string($byte)
maxLength: 32
signature*	string($byte)
maxLength: 256
certificateThumbprint*	string
minLength: 1
example: b785a0b4d8a734a55ba595d143b4cf72834cd88d
SHA-1 Thumbprint of Certificate used for signature

}
nullable: true
fiscalDayClosed	string($date-time)
nullable: true
fiscalDayCounter	[
nullable: true
FiscalDayCounterDto{
fiscalCounterType*	string
Enum:
[ SaleByTax, SaleTaxByTax, CreditNoteByTax, CreditNoteTaxByTax, DebitNoteByTax, DebitNoteTaxByTax, BalanceByMoneyType, PayoutByTax, PayoutTaxByTax ]
fiscalCounterCurrency*	string
maxLength: 3
minLength: 3
fiscalCounterTaxPercent	number($double)
nullable: true
fiscalCounterTaxID	integer($int32)
nullable: true
fiscalCounterMoneyType	string
nullable: true
Enum:
[ Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other ]
fiscalCounterValue*	number($double)
}]
lastReceiptGlobalNo	integer($int32)
nullable: true
lastFiscalDayNo	integer($int32)
nullable: true
fiscalDayClosingErrorCode	string
nullable: true
Enum:
Array [ 5 ]
fiscalDayDocumentQuantities	[
nullable: true
List of fiscal day document quantities. This field is returned only when fiscalDayStatus is �FiscalDayClosed� and fiscalDayReconciliationMode is �Manual�. FiscalDayDocumentQuantity type description provided in FiscalDayDocumentQuantity table.

FiscalDayDocumentQuantity{
receiptType*	string
example: FiscalInvoice
Type of receipt

Enum:
[ FiscalInvoice, CreditNote, DebitNote ]
receiptCurrency*	string
maxLength: 3
minLength: 3
example: USD
Receipt counter currency (ISO 4217 currency code).

receiptQuantity*	integer($int32)
example: 200
Total quantity of receipts of particular receipt type and currency for fiscal day.

receiptTotalAmount*	number($double)
example: 3500.05
Total receipt amount (including tax) of receipts of particular receipt type and currency for fiscal day.

}]
}
InvoiceWithValidationError{
receiptCounter	integer($int32)
nullable: true
receiptGlobalNo	integer($int32)
nullable: true
validationErrors	[
nullable: true
ValidationError{...}]
}
IssueCertificateRequest{
certificateRequest*	string
minLength: 1
example: -----BEGIN CERTIFICATE REQUEST-----\nMIHYMIGAAgEAMB4xHDAaBgNVBAMME1pSQi1lVkZELTAwMDAwMDAwNDIwWTATBgcq\nhkjOPQIBBggqhkjOPQMBBwNCAAT7v3DvY7pRg4lz2Z87wSMwSX27KwlpYnSRV6WU\niPjpq2XsUAbg2lhUN7q3mlNJaUzqoKPmop5qURIpqUydXfapoAAwCgYIKoZIzj0E\nAwIDRwAwRAIgLMEJQDh18bUE9waT2UXzP0+8FcGukpcIegMxd1A4JaQCIAZkzmEH\ne0aaZ2jIcZArZo+rWzI4IwnSXtJqXLrpGUML\n-----END CERTIFICATE REQUEST-----
Certificate signing request (CSR) for which certificate will be generated (in PEM format). certificateRequest requirements are specified in registerDevice endpoint description.

}
IssueCertificateResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

certificate*	string
minLength: 1
}
ListRequestOrderEnumstring
Enum:
[ asc, desc ]
ListSubmittedFileEnumstring
Enum:
[ DeviceId, FileName, FileUploadDate, FileProcessingDate, FileProcessingStatus, FileProcessingError ]
LogicalOperatorstring
Enum:
[ And, Or ]
MoneyTypestring
Enum:
[ Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other ]
OpenDayRequest{
fiscalDayNo	integer($int32)
nullable: true
example: 101
Fiscal day number assigned by device. If this field is not sent, Fiscalisation Backend will generate fiscal day number and return to device. Validation rules:

fiscalDayNo must be equal to 1 for the first fiscal day of fiscal device
fiscalDayNo must be greater by one from the last closed fiscal day fiscalDayNo.
fiscalDayOpened*	string($date-time)
example: 2023-03-30T18:38:54
Date and time when fiscal day was opened on a device. Time is provided in local time without time zone information.

}
OpenDayResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

fiscalDayNo*	integer($int32)
}
PaymentDto{
moneyTypeCode*	string
Enum:
[ Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other ]
paymentAmount*	number($double)
}
PingResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

reportingFrequency*	integer($int32)
Reporting frequency in minutes.

}
ProblemDetails{
type	string
nullable: true
title	string
nullable: true
status	integer($int32)
nullable: true
detail	string
nullable: true
instance	string
nullable: true
}
ReceiptDto{
receiptType*	string
Enum:
[ FiscalInvoice, CreditNote, DebitNote ]
receiptCurrency*	string
maxLength: 3
minLength: 0
receiptCounter*	integer($int32)
receiptGlobalNo*	integer($int32)
invoiceNo*	string
maxLength: 50
minLength: 0
buyerData	{
buyerRegisterName	string
maxLength: 200
minLength: 0
nullable: true
buyerTradeName	string
maxLength: 200
minLength: 0
nullable: true
vatNumber	string
maxLength: 9
minLength: 9
nullable: true
buyerTIN	string
maxLength: 10
minLength: 10
nullable: true
buyerContacts	{
phoneNo	string
maxLength: 20
nullable: true
email	string
maxLength: 100
nullable: true
}
nullable: true
buyerAddress	{
province	string
maxLength: 100
minLength: 0
nullable: true
city	string
maxLength: 100
minLength: 0
nullable: true
street	string
maxLength: 100
minLength: 0
nullable: true
houseNo	string
maxLength: 250
minLength: 0
nullable: true
district	string
maxLength: 100
minLength: 0
nullable: true
}
nullable: true
}
nullable: true
receiptNotes	string
maxLength: 500
minLength: 0
nullable: true
username	string
maxLength: 100
minLength: 0
nullable: true
usernameSurname	string
maxLength: 250
minLength: 0
nullable: true
receiptDate*	string($date-time)
creditDebitNote	{
receiptID	integer($int64)
nullable: true
deviceID	integer($int32)
nullable: true
receiptGlobalNo	integer($int32)
nullable: true
fiscalDayNo	integer($int32)
nullable: true
}
nullable: true
receiptLinesTaxInclusive*	boolean
receiptLines*	[ReceiptLineDto{
receiptLineType*	string
Enum:
[ Sale, Discount ]
receiptLineNo*	integer($int32)
receiptLineHSCode	string
maxLength: 8
minLength: 0
nullable: true
receiptLineName*	string
maxLength: 200
minLength: 0
receiptLinePrice	number($double)
nullable: true
receiptLineQuantity*	number($double)
receiptLineTotal*	number($double)
taxCode	string
maxLength: 3
minLength: 0
nullable: true
taxPercent	number($double)
nullable: true
taxID*	integer($int32)
}]
receiptTaxes*	[ReceiptTaxDto{
taxCode	string
maxLength: 3
minLength: 0
nullable: true
taxPercent	number($double)
nullable: true
taxID*	integer($int32)
taxAmount*	number($double)
salesAmountWithTax*	number($double)
}]
receiptPayments*	[PaymentDto{
moneyTypeCode*	string
Enum:
[ Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other ]
paymentAmount*	number($double)
}]
receiptTotal*	number($double)
receiptPrintForm	string
nullable: true
Enum:
[ Receipt48, InvoiceA4 ]
receiptDeviceSignature*	{
hash*	string($byte)
maxLength: 32
signature*	string($byte)
maxLength: 256
}
}
ReceiptLineDto{
receiptLineType*	string
Enum:
[ Sale, Discount ]
receiptLineNo*	integer($int32)
receiptLineHSCode	string
maxLength: 8
minLength: 0
nullable: true
receiptLineName*	string
maxLength: 200
minLength: 0
receiptLinePrice	number($double)
nullable: true
receiptLineQuantity*	number($double)
receiptLineTotal*	number($double)
taxCode	string
maxLength: 3
minLength: 0
nullable: true
taxPercent	number($double)
nullable: true
taxID*	integer($int32)
}
ReceiptLineTypestring
Enum:
[ Sale, Discount ]
ReceiptPrintFormstring
Enum:
[ Receipt48, InvoiceA4 ]
ReceiptTaxDto{
taxCode	string
maxLength: 3
minLength: 0
nullable: true
taxPercent	number($double)
nullable: true
taxID*	integer($int32)
taxAmount*	number($double)
salesAmountWithTax*	number($double)
}
ReceiptTypestring
Enum:
[ FiscalInvoice, CreditNote, DebitNote ]
SignatureDataDto{
hash*	string($byte)
maxLength: 32
signature*	string($byte)
maxLength: 256
}
SignatureDataEx{
hash*	string($byte)
maxLength: 32
signature*	string($byte)
maxLength: 256
certificateThumbprint*	string
minLength: 1
example: b785a0b4d8a734a55ba595d143b4cf72834cd88d
SHA-1 Thumbprint of Certificate used for signature

}
SubmitFileResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

}
SubmitReceiptRequest{
receipt*	{
description:	
Receipt data

receiptType*	string
Enum:
Array [ 3 ]
receiptCurrency*	string
maxLength: 3
minLength: 0
receiptCounter*	integer($int32)
receiptGlobalNo*	integer($int32)
invoiceNo*	string
maxLength: 50
minLength: 0
buyerData	{
buyerRegisterName	string
maxLength: 200
minLength: 0
nullable: true
buyerTradeName	string
maxLength: 200
minLength: 0
nullable: true
vatNumber	string
maxLength: 9
minLength: 9
nullable: true
buyerTIN	string
maxLength: 10
minLength: 10
nullable: true
buyerContacts	{
phoneNo	string
maxLength: 20
nullable: true
email	string
maxLength: 100
nullable: true
}
nullable: true
buyerAddress	{
province	string
maxLength: 100
minLength: 0
nullable: true
city	string
maxLength: 100
minLength: 0
nullable: true
street	string
maxLength: 100
minLength: 0
nullable: true
houseNo	string
maxLength: 250
minLength: 0
nullable: true
district	string
maxLength: 100
minLength: 0
nullable: true
}
nullable: true
}
nullable: true
receiptNotes	string
maxLength: 500
minLength: 0
nullable: true
username	string
maxLength: 100
minLength: 0
nullable: true
usernameSurname	string
maxLength: 250
minLength: 0
nullable: true
receiptDate*	string($date-time)
creditDebitNote	{
receiptID	integer($int64)
nullable: true
deviceID	integer($int32)
nullable: true
receiptGlobalNo	integer($int32)
nullable: true
fiscalDayNo	integer($int32)
nullable: true
}
nullable: true
receiptLinesTaxInclusive*	boolean
receiptLines*	[ReceiptLineDto{
receiptLineType*	string
Enum:
[ Sale, Discount ]
receiptLineNo*	integer($int32)
receiptLineHSCode	string
maxLength: 8
minLength: 0
nullable: true
receiptLineName*	string
maxLength: 200
minLength: 0
receiptLinePrice	number($double)
nullable: true
receiptLineQuantity*	number($double)
receiptLineTotal*	number($double)
taxCode	string
maxLength: 3
minLength: 0
nullable: true
taxPercent	number($double)
nullable: true
taxID*	integer($int32)
}]
receiptTaxes*	[ReceiptTaxDto{
taxCode	string
maxLength: 3
minLength: 0
nullable: true
taxPercent	number($double)
nullable: true
taxID*	integer($int32)
taxAmount*	number($double)
salesAmountWithTax*	number($double)
}]
receiptPayments*	[PaymentDto{
moneyTypeCode*	string
Enum:
[ Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other ]
paymentAmount*	number($double)
}]
receiptTotal*	number($double)
receiptPrintForm	string
nullable: true
Enum:
[ Receipt48, InvoiceA4 ]
receiptDeviceSignature*	{
hash*	string($byte)
maxLength: 32
signature*	string($byte)
maxLength: 256
}
}
}
SubmitReceiptResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

receiptID*	integer($int64)
serverDate*	string($date-time)
receiptServerSignature*	{
hash*	string($byte)
maxLength: 32
signature*	string($byte)
maxLength: 256
certificateThumbprint*	string
minLength: 1
example: b785a0b4d8a734a55ba595d143b4cf72834cd88d
SHA-1 Thumbprint of Certificate used for signature

}
validationErrors	[
nullable: true
ValidationError{
validationErrorCode*	string
maxLength: 10
minLength: 0
validationErrorColor*	string
maxLength: 10
minLength: 0
}]
}
SubmittedFileHeaderDto{
fileName	string
nullable: true
fileUploadDate	string($date-time)
nullable: true
deviceId	integer($int32)
dayNo	integer($int32)
fiscalDayOpenedAt	string($date-time)
fileSequence	integer($int32)
fileProcessingDate	string($date-time)
nullable: true
fileProcessingStatus	string
Enum:
[ InProgress, CompleteSuccessful, FailedWithErrors, WaitingForPreviousFile ]
fileProcessingError	string
nullable: true
Enum:
[ IncorrectFileFormat, FileSentForClosedDay, BadCertificateSignature, MissingReceipts, ReceiptsWithValidationErrors, CountersMismatch, FileExceededAllowedWaitingTime, InternalError ]
hasFooter	boolean
operationId	string
maxLength: 100
nullable: true
ipAddress	string
maxLength: 100
nullable: true
invoiceWithValidationErrors	[
nullable: true
InvoiceWithValidationError{
receiptCounter	integer($int32)
nullable: true
receiptGlobalNo	integer($int32)
nullable: true
validationErrors	[
nullable: true
ValidationError{
validationErrorCode*	string
maxLength: 10
minLength: 0
validationErrorColor*	string
maxLength: 10
minLength: 0
}]
}]
}
SubmittedFileHeaderDtoListResponse{
total	integer($int32)
rows	[
nullable: true
SubmittedFileHeaderDto{
fileName	string
nullable: true
fileUploadDate	string($date-time)
nullable: true
deviceId	integer($int32)
dayNo	integer($int32)
fiscalDayOpenedAt	string($date-time)
fileSequence	integer($int32)
fileProcessingDate	string($date-time)
nullable: true
fileProcessingStatus	string
Enum:
[ InProgress, CompleteSuccessful, FailedWithErrors, WaitingForPreviousFile ]
fileProcessingError	string
nullable: true
Enum:
[ IncorrectFileFormat, FileSentForClosedDay, BadCertificateSignature, MissingReceipts, ReceiptsWithValidationErrors, CountersMismatch, FileExceededAllowedWaitingTime, InternalError ]
hasFooter	boolean
operationId	string
maxLength: 100
nullable: true
ipAddress	string
maxLength: 100
nullable: true
invoiceWithValidationErrors	[
nullable: true
InvoiceWithValidationError{
receiptCounter	integer($int32)
nullable: true
receiptGlobalNo	integer($int32)
nullable: true
validationErrors	[
nullable: true
ValidationError{
validationErrorCode*	string
maxLength: 10
minLength: 0
validationErrorColor*	string
maxLength: 10
minLength: 0
}]
}]
}]
}
Tax{
taxPercent	number($double)
nullable: true
taxName*	string
maxLength: 50
minLength: 0
validFrom*	string($date-time)
validTill	string($date-time)
nullable: true
taxID*	integer($int32)
Tax ID uniquely identifying a tax. This tax ID must be used in submitting invoices.

}
ValidationError{
validationErrorCode*	string
maxLength: 10
minLength: 0
validationErrorColor*	string
maxLength: 10
minLength: 0
}
ValidationProblemDetails{
type	string
nullable: true
title	string
nullable: true
status	integer($int32)
nullable: true
detail	string
nullable: true
instance	string
nullable: true
errors	{
< * >:	[string]
}
nullable: true
}