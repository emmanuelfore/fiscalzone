Select a definition

Public-v1
Fiscal backend FiscalDeviceApi Build:1.0.0.0
 1.0 
OAS 3.0
/swagger/Public-v1/swagger.json
Public
Public endpoints do not require client certificate to authenticate.



POST
/Public/v1/{deviceID}/RegisterDevice

Endpoint is used to get device certificate and register device in Fiscalisation Backend (link device with Fiscalisation Backend).

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
Sold or active device ID

deviceID
DeviceModelName *
string
(header)
Device model name as registered in Tax Authority

DeviceModelName
DeviceModelVersion *
string
(header)
Device model version number as registered in Tax Authority

DeviceModelVersion
Request body

application/json
Example Value
Schema
{
  "certificateRequest": "-----BEGIN CERTIFICATE REQUEST-----\\nMIHYMIGAAgEAMB4xHDAaBgNVBAMME1pSQi1lVkZELTAwMDAwMDAwNDIwWTATBgcq\\nhkjOPQIBBggqhkjOPQMBBwNCAAT7v3DvY7pRg4lz2Z87wSMwSX27KwlpYnSRV6WU\\niPjpq2XsUAbg2lhUN7q3mlNJaUzqoKPmop5qURIpqUydXfapoAAwCgYIKoZIzj0E\\nAwIDRwAwRAIgLMEJQDh18bUE9waT2UXzP0+8FcGukpcIegMxd1A4JaQCIAZkzmEH\\ne0aaZ2jIcZArZo+rWzI4IwnSXtJqXLrpGUML\\n-----END CERTIFICATE REQUEST-----",
  "activationKey": "12AXC178"
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
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "errorCode": "DEV01",
  "type": "https://httpstatuses.io/422",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Device not found or not active",
  "operationID": "0HMPDRRQL1C0G:00000005"
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
/Public/v1/GetServerCertificate

Endpoint is used to retrieve Fiscalisation Backend certificate for Fiscalisation Backend signature validation. Despite of the parameter is provided or not, and despite what certificate in the chain thumbprint indicates (first, second or third level certificate), full certificate chain is returned

Parameters
Cancel
Name	Description
thumbprint
string
(query)
Thumbprint of Fiscalisation Backend certificate which should be returned. If field is not provided, currently active Fiscalisation Backend signing certificate is returned

b785a0b4d8a734a55ba595d143b4cf72834cd88d
Execute
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
  "operationID": "0HMPHA0KCMPHN:00000005",
  "certificate": [
    "-----BEGIN CERTIFICATE-----\nMIIDQTCCAikCFFLwDNnN3ZnAriN4wanJF439cX53MA0GCSqGSIb3DQEBCwUAMF0x\nCzAJBgNVBAYTAkxUMRMwEQYDVQQIDApFTEVLVFJFTkFJMRMwEQYDVQQHDApFTEVL\nVFJFTkFJMREwDwYDVQQKDAhldHJvbmlrYTERMA8GA1UEAwwIemltcmFfQ0EwHhcN\nMjMwMzE2MTA1NDAxWhcNMzMwMzEzMTA1NDAxWjBdMQswCQYDVQQGEwJMVDETMBEG\nA1UECAwKRUxFS1RSRU5BSTETMBEGA1UEBwwKRUxFS1RSRU5BSTERMA8GA1UECgwI\nZXRyb25pa2ExETAPBgNVBAMMCHppbXJhX0NBMIIBIjANBgkqhkiG9w0BAQEFAAOC\nAQ8AMIIBCgKCAQEA30dU24HCzSd+y4/ho41at23gh1g2Yjhk8SnUNo5PLn2uoUvj\nUemQNuJFjg14LvBPoubcIfOZW6cp9TCGy8KqG3WyVrT9z9sEl4fQMlEsCegmCEIE\nng7PvtsdJL9CaC7x11KK4az5UpzqUQ2gyYOryF6M8BT6wH5U61og2SWfv4M5ttQc\nbBDFbReeCYBLvSzFisI1CAVnc3CLqLhBN5jHxfraeZyAvLzBFnbYj7RBcv28iGRz\ny6LXtgE9yDeRdtCk8UqrgyMe//LWmlu+mmLb2IdIeD66GkD637FURa9lAcDJksUP\nUep2TyXq44JjMeNz7CyPbJ0wlV49cUlKc+/ZVQIDAQABMA0GCSqGSIb3DQEBCwUA\nA4IBAQAPVhhMAvjpQRm9OqZz3k97/yygqxeNKdTjxc/zVO8gj0pRBclVhxCnfj+P\nA1wc1nBEHvZ0oh03JviGQ8wxTLWUc0vWlZICmST7heC3DeA+xh90mLZOb2kK3cko\nY7kTAQ8cLV+ddI4UI46WQ6q/bhueOZQjMf1K2IP0fUhXxgFtrPXXrlkiUNX4tisg\ncy986/JjIHk2sY3OyBqYeFwq5J6DO2kMfLgHzwlaVWnTiXJ/etK17fynETImldZU\n9qSHYEyURqKuDyjELRThDLDTGwnsL5HU31+RCmGCZuNpjqkdne8hedNISdyCsMvD\ndDY0A7Vf+2WmfxWzg0wbhf6cIjxS\n-----END CERTIFICATE-----",
    "-----BEGIN CERTIFICATE-----\nMIIDcDCCAligAwIBAgIISVJfo63v2tswDQYJKoZIhvcNAQELBQAwXTELMAkGA1UE\nBhMCTFQxEzARBgNVBAgMCkVMRUtUUkVOQUkxEzARBgNVBAcMCkVMRUtUUkVOQUkx\nETAPBgNVBAoMCGV0cm9uaWthMREwDwYDVQQDDAh6aW1yYV9DQTAeFw0yMzAzMjAx\nOTM5NTVaFw0yNjAzMjAyMTIzMTBaMGwxCzAJBgNVBAYTAlpXMREwDwYDVQQIDAha\naW1iYWJ3ZTEsMCoGA1UECgwjWmltYmFid2UgRmlzY2FsaXNhdGlvbiBPcmdhbml6\nYXRpb24xHDAaBgNVBAMME1pSQi1lVkZELTAwMDAwMDAwNDIwWTATBgcqhkjOPQIB\nBggqhkjOPQMBBwNCAAT7v3DvY7pRg4lz2Z87wSMwSX27KwlpYnSRV6WUiPjpq2Xs\nUAbg2lhUN7q3mlNJaUzqoKPmop5qURIpqUydXfapo4HvMIHsMAkGA1UdEwQCMAAw\nHQYDVR0OBBYEFGqv3pesJRu7AJBrDE7T/+dM4Kg1MIGaBgNVHSMEgZIwgY+AFIKH\n58WkIDv0AUhEr+O0qvs6Dk7VoWGkXzBdMQswCQYDVQQGEwJMVDETMBEGA1UECAwK\nRUxFS1RSRU5BSTETMBEGA1UEBwwKRUxFS1RSRU5BSTERMA8GA1UECgwIZXRyb25p\na2ExETAPBgNVBAMMCHppbXJhX0NBghRS8AzZzd2ZwK4jeMGpyReN/XF+dzAOBgNV\nHQ8BAf8EBAMCBeAwEwYDVR0lBAwwCgYIKwYBBQUHAwIwDQYJKoZIhvcNAQELBQAD\nggEBAMkQykLAfhUGYaMR71kdwgFShstjK12v0sg69ruNtnlIajs3H9vaYoZRvPOV\n5jkdKlzF4Erp8D9URTJQD9aNCHqOZg1wSytuQqxedoThaWSYL3eiUf3Rig+II/fG\n/F+sr0pC6QrriJKRHH8aeAUF2jXD/CyI/GcftBIMTr91egV5Bn3Pjwfh8aEFzq7R\nqF4p0p8UBPwJtFUSqC4JkwLkpfG8bMpNHYic97+PRRLlrqiSPrQF/rlLQDC4IpMc\n9oMHuYHi2CmMcpnXLNZhgeFhHpILKOloU/AGtsExDS4gHCm/LfkUAz3p0KTIxnfx\nj5QjByFH8P3rY05BmSdE4aFUnxM=\n-----END CERTIFICATE-----"
  ],
  "certificateValidTill": "2026-03-20T21:23:10"
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
404	
Certificate requested by thumbprint not found

Media type

application/problem+json
Example Value
Schema
{
  "type": "https://httpstatuses.io/404",
  "title": "Not Found",
  "status": 400,
  "operationID": "0HMPDRRQL1C0G:00000005"
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
  "errorCode": "DEV01",
  "type": "https://httpstatuses.io/422",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Device not found or not active",
  "operationID": "0HMPDRRQL1C0G:00000005"
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
/Public/v1/{deviceID}/VerifyTaxpayerInformation

Endpoint is used to retrieve taxpayer information from system before device registration (in order user could double check if device is going to be registered to correct taxpayer).

Parameters
Try it out
Name	Description
deviceID *
integer($int32)
(path)
Sold or active device ID

deviceID
Request body

application/json
Example Value
Schema
{
  "activationKey": "12AXC178",
  "deviceSerialNo": "SN-001"
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
  "taxPayerName": "string",
  "taxPayerTIN": "string",
  "vatNumber": "string",
  "deviceBranchName": "string",
  "deviceBranchAddress": {
    "province": "string",
    "city": "string",
    "street": "string",
    "houseNo": "string",
    "district": "string"
  },
  "deviceBranchContacts": {
    "phoneNo": "string",
    "email": "string"
  }
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
422	
Operation failed because of provided data or invalid object state in Fiscal backend. Returns problem details structure as described in https://www.rfc-editor.org/rfc/rfc7807 with errorCode field to specify error.

Media type

application/problem+json
Example Value
Schema
{
  "errorCode": "DEV01",
  "type": "https://httpstatuses.io/422",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Device not found or not active",
  "operationID": "0HMPDRRQL1C0G:00000005"
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
ContactsDto{
phoneNo	string
maxLength: 20
nullable: true
email	string
maxLength: 100
nullable: true
}
GetServerCertificateResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

certificate	[
nullable: true
Fiscalisation Backend certificate chain (according x.509 standard) to validate Fiscalisation Backend signatures.

string]
certificateValidTill	string($date-time)
Date till when Fiscalisation Backend signing certificate is valid (despite that in the certificate parameter all the certificate chain is returned, this field shows validity time of the child certificate in the chain). Times is provided in UTC time.

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
RegisterDeviceRequest{
certificateRequest*	string
minLength: 1
example: -----BEGIN CERTIFICATE REQUEST-----\nMIHYMIGAAgEAMB4xHDAaBgNVBAMME1pSQi1lVkZELTAwMDAwMDAwNDIwWTATBgcq\nhkjOPQIBBggqhkjOPQMBBwNCAAT7v3DvY7pRg4lz2Z87wSMwSX27KwlpYnSRV6WU\niPjpq2XsUAbg2lhUN7q3mlNJaUzqoKPmop5qURIpqUydXfapoAAwCgYIKoZIzj0E\nAwIDRwAwRAIgLMEJQDh18bUE9waT2UXzP0+8FcGukpcIegMxd1A4JaQCIAZkzmEH\ne0aaZ2jIcZArZo+rWzI4IwnSXtJqXLrpGUML\n-----END CERTIFICATE REQUEST-----
Certificate signing request (CSR) for which certificate will be generated (in PEM format). Assigned by Tax Authority device name (format: [CLIENT]-[Fiscal_device_serial_no]-[zero_padded_10_digit_deviceId]) should be provided in CSR`s Subject CN. Supported algorithms and key types (in order of suggested preference):

ECC ECDSA on SECG secp256r1 curve (also named as ANSI prime256v1, NIST P-256); Signature Algorithm: ecdsa-with-SHA256.
RSA 2048; Signature Algorithm - SHA256WithRSA.
activationKey*	string
maxLength: 8
minLength: 0
example: 12AXC178
Case insensitive 8 symbols key

}
RegisterDeviceResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

certificate*	string
minLength: 1
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
VerifyTaxpayerInformationRequest{
activationKey*	string
maxLength: 8
minLength: 1
example: 12AXC178
Case insensitive 8 symbols key

deviceSerialNo*	string
maxLength: 20
minLength: 1
example: SN-001
Device serial number assigned by manufacturer.

}
VerifyTaxpayerInformationResponse{
operationID*	string
maxLength: 60
minLength: 0
example: 0HMPH9AF0QKKE:00000005
Operation ID assigned by Fiscalisation Backend.

taxPayerName*	string
maxLength: 250
minLength: 1
taxPayerTIN*	string
maxLength: 10
minLength: 1
vatNumber	string
maxLength: 9
nullable: true
deviceBranchName*	string
maxLength: 250
minLength: 1
deviceBranchAddress*	{
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
deviceBranchContacts	{
phoneNo	string
maxLength: 20
nullable: true
email	string
maxLength: 100
nullable: true
}
nullable: true
}