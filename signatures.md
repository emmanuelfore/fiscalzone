13.SIGNATURES GENERATION AND VERIFICATION RULES
13.1. Signature an hash generation algorithm
Below algorithm is used to generate receipt and fiscal day hash and signature:
1) Receipt or fiscal day fields must be converted to string (by rules as described in table
below) and concatenated (no concatenation character is used);
2) Concatenated line must be hashed using SHA256 to get the hash;
3) Concatenated line must be signed with private key to get the signature.
Formula to get a hash: Hash = SHA-256(x1|| x2||…||xn);
Formula to get a signature:
Signature = RSA(x1|| x2||…||xn,d,n) – in case RSA keys are used
or
Signature = ECC(Hash,CURVE,g,n) – in case ECC keys are used
Where
|| - means field concatenation;
x1, x2, …, xn - receipt or fiscal day fields;
d – secret RSA exponent;
n - RSA modulus
CURVE – the elliptic curve field and equation used
G – elliptic curve base point, a point on the curve that generates a subgroup of large
prime order n
n – integer order of G, means that n x G=O, where O is the identity element.
13.2.Receipt signature generation and verification
Receipt hash and signature are generated according to the rules provided in section
13.1.
13.2.1. Receipt device signature
Fields included in receipt hash which is used for device signature are (these fields must
be included in hash in the same order as provided below):
Order Field name Description
1 deviceID Device ID
2 receiptType Receipt type value in upper case.
3 receiptCurrency Currency code (ISO 4217 currency code). It must be in upper case.
4 receiptGlobalNo Receipt global number.
5 receiptDate Date in ISO 8601 format <date>T<time>, YYYY-MM-DDTHH:mm:ss (hours are
represented in 24 hours format, local time).
Example: 2019-09-23T14:43:23
6 receiptTotal Receipt total is included in signature in cents.
Examples:
- If receiptTotal is 500 ZWL, value 50000 must be used in signature.
- If receiptTotal is 12,34 USD, value 1234 must be used in signature.
- If receiptTotal is 0,05 USD, value 5 must be used in signature.
7 receiptTaxes Concatenated receiptTaxes, where each line is concatenated in this way:
taxCode || taxPercent || taxAmount || salesAmountWithTax.
In case of taxPercent is not sent, empty value should be used in signature.
Amounts are represented in cents. In case taxPercent is not an integer
there should be dot between the integer and fractional part. In case of
exempt which does not send tax percent value, empty value should be used
in signature.
Copyright © ZIMRA 73 of 77
In case taxPercent is an integer there should be value of tax percent, dot
and two zeros sent.
Taxes are ordered by taxID in ascending order and taxCode in alphabetical
order (if taxCode is empty it is ordered before A letter).
Examples:
- If taxPercent is 15, value 15.00 must be used in signature.
- If taxPercent is 14.5 value 14.50 must be used in signature.
- If taxPercent is 0 value 0.00 must be used in signature.
8 previousReceiptHash Previous receipt hash is included into current receipt device signature. This
will create a chain of receipts.
This field is not used in signature when current receipt is first in fiscal day.
FiscalInvoice Examples:
Name Example No 1
deviceID 321
receiptType FISCALINVOICE
receiptCurrency ZWL
receiptGlobalNo 432
receiptDate 2019-09-19T15:43:12
receiptTotal 9450,00
receiptTaxes Tax lines:
taxID taxCode taxPercent taxAmount salesAmountWithTax
1 A 0,00 2500,00
2 B 0 0,00 3500,00
3 C 15 150,00 1150,00
3 D 15 300,00 2300,00
Result:
A0250000B0.000350000C15.0015000115000D15.0030000230000
previousReceiptHash hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Result used for hash
generation
321FISCALINVOICEZWL4322019-09-
19T15:43:12945000A0250000B0.000350000C15.0015000115000D15.0030000230000
hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Generated receipt hash in
base64 representation
zDxEalWUpwX2BcsYxRUAEfY/13OaCrTwDt01So3a6uU=
Name Example No 2
deviceID 322
receiptType FISCALINVOICE
receiptCurrency USD
receiptGlobalNo 85
receiptDate 2019-09-19T09:23:07
receiptTotal 40,35
receiptTaxes Tax lines:
taxID taxPercent taxAmount salesAmountWithTax
1 0,00 7,00
2 0 0,00 10,00
3 14,5 0,05 0,35
Result:
07000.000100014.50535
previousReceiptHash hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Result used for hash
generation
07000.000100014.50535 hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Generated receipt hash in
base64 representation
2zInR7ciOQ9PbtQlKaU5XoktQ/4/y1XShfzEEoSVO7s=
CreditNote Examples:
Name Example No 1
Copyright © ZIMRA 74 of 77
deviceID 321
receiptType CREDITNOTE
receiptCurrency ZWL
receiptGlobalNo 432
receiptDate 2020-09-19T15:43:12
receiptTotal -9450,00
receiptTaxes Tax lines:
taxID taxCode taxPercent taxAmount salesAmountWithTax
1 A 0,00 -2500,00
2 B 0 0,00 -3500,00
3 C 15 -150,00 -1150,00
3 D 15 -300,00 -2300,00
Result:
A0-250000B0.000-350000C15.00-15000-115000D15.00-30000-230000
previousReceiptHash hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Result used for hash
generation
321CREDITNOTEZWL4322020-09-19T15:43:12-945000 A0-250000B0.000-350000C15.00-15000-
115000D15.00-30000-230000hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Generated receipt hash in
base64 representation
Wu21g3N0fPIa67pnAp+FZkaEfBiv696B+4QoJCWRIcY=
Name Example No 2
deviceID 322
receiptType CREDITNOTE
receiptCurrency USD
receiptGlobalNo 85
receiptDate 2020-09-19T09:23:07
receiptTotal -40,35
receiptTaxes Tax lines:
taxID taxPercent taxAmount salesAmountWithTax
1 0,00 -7,00
2 0 0,00 -10,00
3 14,5 -3,00 -23,00
Result:
0-7000.000-100014.50-300-2300
previousReceiptHash hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Result used for hash
generation
322CREDITNOTEUSD852020-09-19T09:23:07-40350-7000.000-100014.50-300-
2300hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Generated receipt hash in
base64 representation
F9/QB0vhxQlEF2nk+oebwP8V+qBcNlOFvoTeE/1QxPc=
DebitNote Examples:
Name Example No 1
deviceID 321
receiptType DEBITNOTE
receiptCurrency ZWL
receiptGlobalNo 432
receiptDate 2020-09-19T15:43:12
receiptTotal 9450,00
receiptTaxes Tax lines:
taxID taxCode taxPercent taxAmount salesAmountWithTax
1 A 0,00 2500,00
2 B 0 0,00 3500,00
3 C 15 150,00 1150,00
3 C 15 300,00 2300,00
Result:
A0250000B0.000350000C15.0015000115000D15.0030000230000
Copyright © ZIMRA 75 of 77
previousReceiptHash hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Result used for hash
generation
321DEBITNOTEZWL4322020-09-19T15:43:12945000
A0250000B0.000350000C15.0015000115000D15.0030000230000hNVJXP/ACOiE8McD3pKsDlqBXpuaUq
QOfPnMyfZWI9k=
Generated receipt hash in
base64 representation
PHcormpq5Ppb/6Quh8iOY3bDq4B4cPW5hsENb65iK/I=
Name Example No 2
deviceID 322
receiptType DEBITNOTE
receiptCurrency USD
receiptGlobalNo 85
receiptDate 2020-09-19T09:23:07
receiptTotal 40,35
receiptTaxes Tax lines:
taxID taxPercent taxAmount salesAmountWithTax
1 0,00 7,00
2 0 0,00 10,00
3 14,5 3,00 23,00
Result:
07000.000100014.503002300
previousReceiptHash hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Result used for hash
generation
322DEBITNOTEUSD852020-09-19T09:23:
07403507000.000100014.503002300hNVJXP/ACOiE8McD3pKsDlqBXpuaUqQOfPnMyfZWI9k=
Generated receipt hash in
base64 representation
YOLYzYhCaaLN2yxrM574B83WUhxSkg52uc1hrM4g8Dw=
13.2.2. Receipt FDMS signature
Receipt FDMS signature may be verified by decrypting receiptServerSignature with FDMS
public key and comparing if it matches with prepared receipt hash. receiptServerSignature is
generated only for receipt submitted in “Online” receipt mode. Hash generation algorithm is
provided in section 13.1.
Fields included in receipt hash which is used for FDMS signature are (these fields must
be included in hash in the same order as provided below):
Order Field name Description
1 receiptDeviceSignature Receipt signature generated by device.
2 receiptID Receipt ID
3 serverDate Date in ISO 8601 format <date>T<time>, YYYY-MM-DDThh:mm:ss (hours are
represented in 24 hours format, local time).
Example: 2019-09-23T14:43:23
Example
Name Exmple
receiptDevi
ceSignature
YyXTSizBBrMjMk4VQL+sCNr+2AC6aQbDAn9JMV2rk3yJ6MDZwie0wqQW3oisNWrMkeZsuAyFSnFkU2A+pKm91sOHVdjeR
BebjQgAQQIMTCVIcYrx+BizQ7Ib9iCdsVI+Jel2nThqQiQzfRef6EgtgsaIAN+PV55xSrHvPkIe+Bc=
receiptID 48377
serverDate 2019-09-19T15:43:12
Result used
for hash
generation
YyXTSizBBrMjMk4VQL+sCNr+2AC6aQbDAn9JMV2rk3yJ6MDZwie0wqQW3oisNWrMkeZsuAyFSnFkU2A+pKm91sOHVdjeR
BebjQgAQQIMTCVIcYrx+BizQ7Ib9iCdsVI+Jel2nThqQiQzfRef6EgtgsaIAN+PV55xSrHvPkIe+Bc=483772019-09-
19T15:43:12
Generated
hash in
base64
representati
on
JQoIo/AgOsvm+PUQpvlQ/U7YMei3m/jbygNrBVfz6Sg=
Copyright © ZIMRA 76 of 77
13.3.Fiscal day signature generation and verification
Fiscal day report hash and signature are generated according to the rules provided in
section 13.1.
13.3.1. Fiscal day device signature
Fields included in fiscal day hash used for device signature are provided below (these
fields must be included in hash in the same order as provided below):
Order Field name Description
1 deviceID Device ID
2 fiscalDayNo Fiscal day number
3 fiscalDayDate Fiscal day date (date when fiscal day was opened).
Date in ISO 8601 format YYYY-MM-DD.
Example: 2019-09-23
4 fiscalDayCounters Concatenated fiscal day counter lines, where each line is concatenated in this
way: fiscalCounterType || fiscalCounterCurrency || fiscalCounterTaxPercent or
fiscalCounterMoneyType || fiscalCounterValue.
All text values are concatenated in upper case.
Amounts are represented in cents.
Only non-zero value fiscal counters are included in concatenation.
Fiscal counters are concatenated in this order:
 fiscalCounterType (in ascending order)
 fiscalCounterCurrency (in alphabetical ascending order)
 fiscalCounterTaxID (in ascending order) / fiscalCounterMoneyType (in
ascending order)
In case taxPercent is not an integer there should be dot between the integer and
fractional part. In case of exempt which does not send tax percent value, empty
value should be used in signature. In case taxPercent is an integer there should be
value of tax percent, dot and two zeros sent.
Examples:
- If taxPercent is 15, value 15.00 must be used in signature.
- If taxPercent is 14.5 value 14.50 must be used in signature.
- If taxPercent is 0 value 0.00 must be used in signature.
Example:
Name Exmple
deviceID 321
fiscalDayNo 84
fiscalDayDate 2019-09-23
fiscalDayCounters fiscalCounterType fiscalCounterC
urrency
fiscalCounterTaxPercent/
fiscalCounterMoneyType
fiscalCounterValue
SaleByTax ZWL 23000,00
SaleByTax ZWL 0 12000,00
SaleByTax USD 14,5 25,00
SaleByTax ZWL 15 12,00
SaleTaxByTax USD 15 2,50
SaleTaxByTax ZWL 15 2300,00
BalanceByMoneyType ZWL CARD 15000,00
BalanceByMoneyType USD CASH 37,00
BalanceByMoneyType ZWL CASH 20000,00
Result:
SALEBYTAXZWL2300000SALEBYTAXZWL0.001200000SALEBYTAXUSD14.502500SALEBYTAXZWL15.001200SA
LETAXBYTAXUSD15.00250SALETAXBYTAXZWL15.00230000BALANCEBYMONEYTYPEUSDLCASH3700BALANCE
BYMONEYTYPEZWLCASH2000000BALANCEBYMONEYTYPEZWLCARD1500000
Result used for hash
generation
321842019-09-
23SALEBYTAXZWL2300000SALEBYTAXZWL0.001200000SALEBYTAXUSD14.502500SALEBYTAXZWL15.001200
SALETAXBYTAXUSD15.00250SALETAXBYTAXZWL15.00230000BALANCEBYMONEYTYPEUSDLCASH3700BALAN
CEBYMONEYTYPEZWLCASH2000000BALANCEBYMONEYTYPEZWLCARD1500000
Generated hash in
base64
representation
OdT8lLI0JXhXl1XQgr64Zb1ltFDksFXThVxqM6O8xZE=
Copyright © ZIMRA 77 of 77
13.3.2. Fiscal day FDMS signature
Fiscal day FDMS signature may be verified by decrypting fiscalDayServerSignature with
FDMS public key and comparing if it matches with prepared fiscal day hash.
Hash generation algorithm is provided in section 13.1.
Fields included in fiscal day hash used for FDMS signature are provided below (these
fields must be included in hash in the same order as provided below):
Order Field name Description
1 deviceID Device ID
2 fiscalDayNo Fiscal day number
3 fiscalDayDate Fiscal day date (date when fiscal day was opened).
Date in ISO 8601 format YYYY-MM-DD.
Example: 2019-09-23
4 fiscalDayUpdated Date and time when fiscal day was closed.
Date in ISO 8601 format <date>T<time>, YYYY-MM-DDThh:mm:ss (hours are
represented in 24 hours format, local time).
Example: 2019-09-23T14:43:23
fiscalDayClosed value from response to device.
5 reconciliationMode Defines how fiscal day was close: automatically or manually.
Possible values (in upper case):
- AUTO
- MANUAL
6 fiscalDayCounters Concatenated fiscal day counter lines as described above in device signature
generation.
7 fiscalDayDeviceSignature Fiscal day signature generated by device. In case fiscal day is closed manually, this
field is not included into hash for FDMS signature.
Example:
Name Exmple
deviceID 321
fiscalDayNo 84
fiscalDayDate 2019-09-23
fiscalDayUpdated 2019-09-23T22:21:14
reconciliationMode AUTO
fiscalDayCounters fiscalCounterType fiscalCounterC
urrency
fiscalCounterTaxPercent/
fiscalCounterMoneyType
fiscalCounterValue
SaleByTax ZWL 23000,00
SaleByTax ZWL 0 12000,00
SaleByTax USD 15 25,00
SaleByTax ZWL 15 12,00
SaleTaxByTax USD 15 2,50
SaleTaxByTax ZWL 15 2300,00
BalanceByMoneyType ZWL CARD 15000,00
BalanceByMoneyType USD CASH 37,00
BalanceByMoneyType ZWL CASH 20000,00
Result:
SALEBYTAXZWL2300000SALEBYTAXZWL0.001200000SALEBYTAXUSD15.002500SALEBYTAXZWL15.001200SALE
TAXBYTAXUSD15.00250SALETAXBYTAXZWL15.00230000BALANCEBYMONEYTYPEZWLCARD1500000BALANCEB
YMONEYTYPEUSDLCASH3700BALANCEBYMONEYTYPEZWLCASH2000000
fiscalDayDeviceSign{"qrUrl":"https://fdmstest.zimra.co.zw","vatNumber":"","operationID":"0HNIQDS4I2SB0:00000001","taxPayerTIN":"1098765667","taxPayerName":"emmanuel","deviceSerialNo":"emmanueltest-1","applicableTaxes":[{"taxID":1,"taxName":"Exempt","validFrom":"2023-01-01T00:00:00"},{"taxID":2,"taxName":"Zero rated 0%","validFrom":"2023-01-01T00:00:00","taxPercent":0},{"taxID":514,"taxName":"Non-VAT Withholding Tax","validFrom":"2024-01-01T00:00:00","taxPercent":5},{"taxID":517,"taxName":"Standard rated 15.5%","validFrom":"2025-12-15T00:00:00","taxPercent":15.5}],"deviceBranchName":"test","taxPayerDayMaxHrs":24,"deviceBranchAddress":{"city":"Harare","street":"Crowhill Road","houseNo":"126","province":"Harare"},"deviceOperatingMode":"Online","certificateValidTill":"2027-01-23T09:37:20","deviceBranchContacts":{"email":"foreemmanuel@gmail.com","phoneNo":"0776344339"},"taxpayerDayEndNotificationHrs":2}
ature
YyXTSizBBrMjMk4VQL+sCNr+2AC6aQbDAn9JMV2rk3yJ6MDZwie0wqQW3oisNWrMkeZsuAyFSnFkU2A+pKm91sO
HVdjeRBebjQgAQQIMTCVIcYrx+BizQ7Ib9iCdsVI+Jel2nThqQiQzfRef6EgtgsaIAN+PV55xSrHvPkIe+Bc=
Result used for
hash generation
321842019-09-232019-09-
23T22:21:14AUTOSALEBYTAXZWL2300000SALEBYTAXZWL0.001200000SALEBYTAXUSD15.002500SALEBYTAXZ
WL15.001200SALETAXBYTAXUSD15.00250SALETAXBYTAXZWL15.00230000BALANCEBYMONEYTYPEZWLCARD1
500000BALANCEBYMONEYTYPEUSDLCASH3700BALANCEBYMONEYTYPEZWLCASH2000000YyXTSizBBrMjMk4VQ
L+sCNr+2AC6aQbDAn9JMV2rk3yJ6MDZwie0wqQW3oisNWrMkeZsuAyFSnFkU2A+pKm91sOHVdjeRBebjQgAQQI
MTCVIcYrx+BizQ7Ib9iCdsVI+Jel2nThqQiQzfRef6EgtgsaIAN+PV55xSrHvPkIe+Bc=
Generated hash in
base64
representation
nlqwrAoFAmXLfuMJlQTdS2m0B4d5X1sTJ2gPo5/Dq+s=