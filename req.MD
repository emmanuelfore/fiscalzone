7. INTEGRATION SETUP REQUIREMENTS
7.1. Communication and security protocols
Fiscal Device Gateway API can be accessed using HTTPS protocol only. All Fiscal Device
Gateway API methods except registerDevice and getServerCertificate use client authentication
certificate which is issued by FDMS.
7.2. Environment addresses
Fiscal Device Gateway API is accessible in testing and production (real) environments.
URL to access API:
Environment URL
Testing environment https://fdmsapitest.zimra.co.zw
Testing environment’s API can also be accessed using Swagger on
https://fdmsapitest.zimra.co.zw/swagger/index.html
Production environment https://fdmsapi.zimra.co.zw
7.3. Authentication and authorization
Fiscal Device Gateway uses mutual TLS authentication
(https://en.wikipedia.org/wiki/Mutual_authentication) to authenticate fiscal device using
fiscal device certificate. Fiscal device certificate is validated against issuing certificate to allow
or deny access to API endpoints.
Note: endpoints 4.1 verifyTaxpayerInformation, 4.2 registerDevice, 4.12 getServerCertificate
are public and do not require authentication. After authentication, provided fiscal device
certificate is checked against issued certificate (see 4.2 registerDevice and 4.3 issueCertificate
and methods for fiscal device certificate issuing) to check if the fiscal device certificate was
issued to calling device (by method parameter deviceId) and the fiscal device certificate was
not revoked.
The Fiscal Device Gateway will return HTTP 401 unauthorized code if:
 The provided fiscal device certificate was issued not by Fiscal Device
Gateway.
 The provided fiscal device certificate was revoked.
 The provided fiscal device certificate expired.
 The provided fiscal device certificate was not issued to calling fiscal
device.
7.4. Timeout Settings
Fiscal Device Gateway API response timeout for any synchronous operation – 30 seconds.
Copyright © ZIMRA 43 of 77
8. ERRORS
In case of API error, the system will return 4xx or 5xx http error code with response
body containing a detailed problem details structure as described in https://www.rfceditor.org/rfc/rfc7807 .
ProblemDetails:
Name Type Mandatory Description
type String Yes
title String Yes human readable problem definition
status Integer Yes Http status code
errorCode String No specific error code, for exact meaning see below
8.1. Http statuses
API can return such http statuses for errors:
Http status Description
400 bad request – the message is malformed and could not be processed by Fiscal Backend Gateway
401 Authentication error (see Authentication and authorization)
404 Resource not found (call to not existing endpoint)
405 method not allowed – trying to access API using unsupported HTTP methos, e.g., POST to get config
422 Unprocessable Content – the instructions given by fiscal device to Fiscal Backend Gateway are incorrect,
the response object ProblemDetails should contain ErrorCode to indicate the exact failing condition (e.g.,
DEV01 – device is blocked and therefore no instructions could be processed from such device)
500 Infrastructure error – the Fiscal Backend Gateway server is not available, or some infrastructure error
occurred. The fiscal device should retry to send message later.
502 Bad gateway - the Fiscal Backend Gateway server could not be contacted. The fiscal device should retry to
send message later.
8.2. Error codes
Error Code Description API methods
DEV01 Device not found or not active All
DEV02 Activation key is incorrect registerDevice
verifyTaxpayerInformation
DEV03 Certificate request is invalid registerDevice
issueCertificate
DEV04 Device model is blacklisted All
DEV05 Taxpayer is not active All
DEV06 Device model and version is not registered in FDMS All
DEV07 Username is already used createUserBegin
DEV08 Provided user information is not correct Login
sendSecurityCode
createUserConfirm
sendSecurityCodeContactChange
Copyright © ZIMRA 44 of 77
confirmUserContactChange
updateUser
changeUserPassword
resetUserPasswordBegin
resetUserPasswordConfirm
DEV09 Security code is not valid createUserConfirm
resetUserPasswordConfirm
confirmUserContactChange
DEV10 Password is not valid changeUserPassword
createUserConfirm
resetUserPasswordConfirm
DEV11 User credentials are incorrect login
DEV12 Token is not valid confirmUserContactCreation
sendSecurityCodeContactChange
confirmUserContactChange
updateUser
changeUserPassword
DEV13 User is not confirmed login
DEV14 Email or phone number is not valid or doesn’t exist sendSecurityCodeContactChange
resetUserPasswordBegin
DEV15 Email or phone number already confirmed confirmUserContactChange
RCPT01 Submitting receipt is not allowed. Fiscal day is closed or fiscal day
close initiated
submitReceipt
RCPT02 Submit receipt failed. The receipt structure invalid or field
requirements not satisfied (e.g., provided field value length is
greater then allowed)
submitReceipt
FISC01 Open day is not allowed openDay
FISC03 Closing day is not allowed. Close day is in progress closeDay
FISC04 Closing day is not allowed. Fiscal day not opened closeDay
FILE01 File is too big. Allowed file size: 3 MB submitFile
FILE02 File structure invalid or field requirements not satisfied (e.g not sent
mandatory fields)
submitFile
getFileStatus
FILE03 Device operating mode is not Offline submitFile
getFileStatus
FILE04 File sent for already closed day or closing in progress submitFile
FILE05 Device id in input parameters and file header are different submitFile
8.2.1. Validation errors
When sumbitReceipt request is received by FDMS and it is not rejected, FDMS validates
receipt data. In case previous receipt is missing, validation rules which require previous receipt
to be present are temporarily marked as grey and are revalidated when previous receipt is
received. After a validation, receipt is stored and signed by FDMS. Receipt validation status
may be valid or invalid. In case of invalid receipt, validation errors are categorized by one of
these colors:
Color Description
Grey This means that received receipt violates receipt chain and makes a gap in receipt chain (previous receipt is
missing). Such receipt is marked in “Grey”. With each of the next received receipt, such “Grey” receipt will
be revalidated (in case newly received receipt is the previous for the “Grey” receipt). After repeated
validation it will remain “Grey” (if newly received receipt is not the previous for it) or become valid.
Copyright © ZIMRA 45 of 77
Fiscal day will not be allowed to be closed automatically if it has at least one “Grey” receipt.
Yellow “Yellow” validation errors are minor ones. Fiscal day will be allowed to be closed automatically if it
contains only “Yellow” validation errors.
Red “Red” validation errors are major ones. Fiscal day fill is not allowed to be closed automatically if it has at
least one “Red” receipt.
Possible validation errors and their color codes:
Validation
error
Color Do validation requires
previous receipt to be
present?
Validation error text
RCPT010 Red No Wrong currency code is used
RCPT011 Red Yes Receipt counter is not sequential.
RCPT012 Red Yes Receipt global number is not sequential.
RCPT013 Red No Invoice number is not unique
RCPT014 Yellow No Receipt date is earlier than fiscal day opening date
RCPT015 Red No Credited/debited invoice data is not provided
RCPT016 Red No No receipt lines provided
RCPT017 Red No Taxes information is not provided
RCPT018 Red No Payment information is not provided
RCPT019 Red No Invoice total amount is not equal to sum of all invoice lines
RCPT020 Red No Invoice signature is not valid
RCPT021 Red No VAT tax is used in invoice while taxpayer is not VAT taxpayer
RCPT022 Red No Invoice sales line price must be greater than 0 (less than 0 for Credit
note), discount line price must be less than 0 for Invoice
RCPT023 Red No Invoice line quantity, must be positive
RCPT024 Red No Invoice line total is not equal to unit price * quantity
RCPT025 Red No Invalid tax is used
RCPT026 Red No Incorrectly calculated tax amount
RCPT027 Red No Incorrectly calculated total sales amount (including tax)
RCPT028 Red No Payment amount must be greater than or equal 0 (less than or equal
to 0 for Credit note)
RCPT029 Red No Credited/debited invoice information provided for regular invoice
RCPT030 Red Yes Invoice date is earlier than previously submitted receipt date
RCPT031 Yellow No Invoice is submitted with the future date
RCPT032 Red No Credit / debit note refers to non-existing invoice
RCPT033 Red No Credited/debited invoice is issued more than 12 months ago
RCPT034 Red No Note for credit/debit note is not provided
RCPT035 Red No Total credit note amount exceeds original invoice amount
RCPT036 Red No Credit/debit note uses other taxes than are used in the original
invoice
RCPT037 Red No Invoice total amount is not equal to sum of all invoice lines and taxes
applied
Copyright © ZIMRA 46 of 77
RCPT038 Red No Invoice total amount is not equal to sum of sales amount including
tax in tax table
RCPT039 Red No Invoice total amount is not equal to sum of all payment amounts
RCPT040 Red No Invoice total amount must be greater than or equal to 0 (less than or
equal to 0 for Credit note)
RCPT041 Yellow No Invoice is issued after fiscal day end
RCPT042 Red No Credit/debit note uses other currency than is used in the original
invoice
RCPT043 Red No Mandatory buyer data fields are not provided
RCPT047 Red No HS code must be sent if taxpayer is a VAT payer
RCPT048 Red No HS code length must be 4 or 8 digits if taxpayer is not VAT payer, 4
or 8 digits if taxpayer is VAT payer and applied tax percent is bigger
than 0, 8 digits if taxpayer is VAT payer and applied tax percent is
equal to 0 or is empty
Copyright © ZIMRA 47 of 77
9. REQUIREMENTS FOR FISCAL DEVICES
This chapter specifies requirements for fiscal devices to be met:
1. Fiscal device must open a new fiscal day before issuing receipts and
invoices.
2. Fiscal device if internet connection is available must retrieve
configuration from FDMS (getConfig endpoint) before opening a new fiscal
day.
3. Fiscal device must save data from getConfig response about taxpayer
and/or its branch (taxpayer name, address, contacts, etc.) and use it for
receipt and invoice printing.
4. Fiscal device must track the time passed from opening a fiscal day, that
it would not exceed maximum allowed fiscal day length (specified in
parameter taxPayerDayMaxHrs) and forbid issuing new receipts and
invoices after that.
5. Fiscal device must inform user about the approaching fiscal day end.
Notification must be shown to the user a few hours before maximum fiscal
day length is reached. The exact number of hours left to maximum fiscal
day length is specified in parameter taxpayerDayEndNotificationHrs.
6. Fiscal device must assign receiptGlobalNo value to a receipt in a
sequential order starting from 1 and continue numbering despite fiscal
day close.
7. In case receiptGlobalNo value becomes very big and taxpayer would like
to reset it, this can be done by submitting the first receipt in a new fiscal
day.
8. Fiscal device must assign receiptCounter value to a receipt in a sequential
order starting from 1 and continue numbering only in the same fiscal day.
After fiscal day closure, receiptCounter must be reset to 0.
9. Fiscal device must not allow to add goods or services with VAT tax to
receipt or invoice if taxpayer is not a VAT taxpayer (VATNumber value is
received in getConfig response). In case taxpayer gets VAT number in the
middle of fiscal day, fiscal device must not allow to issue new receipts or
invoices and must require closing fiscal day first.
10.Fiscal day opening message must be sent immediately after opening a
fiscal day, however if there is no connection, it can be delayed.
11.Receipt must be sent to Fiscal Device Gateway API only after successfully
opening a fiscal day.
12.Fiscal device must send receipt to Fiscal Device Gateway API only after
finishing it (when receipt is printed).
13.Fiscal device must send receipt to Fiscal Device Gateway API one by one
in ascending receiptGlobalNo order, not skipping any of receipt. In case
submission of receipt failed, issue must be fixed, and receipt submission
must be repeated.
Copyright © ZIMRA 48 of 77
14.Fiscal device must send receipt to Fiscal Device Gateway API immediately
after finishing it in case there is an internet connection and there are no
waiting receipts to be sent, otherwise receipt must be put to the queue
on device and send later when connection will be restored.
15.Fiscal device must update counters after issuing a receipt and reset
counters after starting a new fiscal day as specified in 6. Fiscal counters.
16.Fiscal device must renew certificate which is near to expire before its
expiration date.
17.Offline Fiscal device must send file content only for a single closed fiscal
day. File cannot contain invoices from more than one fiscal day.
18.If file is bigger than 3 MB, content should be split into separate files,
footer can’t be split to two or more separate parts.
19.If fiscal day has a lot of receipts, it is recommended to split receipts