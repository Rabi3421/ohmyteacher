# Development mock authentication

These credentials are for the typed mock service only. They must not be shown
in production UI or copied into a real backend configuration.

All school scenarios use school code `OMT001`. The mock OTP is `123456`.

| Identifier | Scenario |
| --- | --- |
| `9876543210` | One School Admin membership |
| `9876543211` | One Accountant membership at Main Branch |
| `9876543212` | Parent and Accountant memberships |
| `9876543213` | Parent memberships for two children |
| `9876543214` | Inactive user |
| `9876543215` | One Branch Admin membership |
| `9876543216` | One Receptionist membership |
| `9876543217` | One Student membership |
| `9876543218` | Inactive membership |

Platform Super Admin identifiers:

- `admin@ohmyteacher.in`
- `9999999999`

Invalid school codes, unregistered identifiers, incorrect OTPs, expired OTP
requests, and excessive OTP attempts return normalized `ApiClientError`
responses.
