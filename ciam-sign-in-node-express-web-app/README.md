# CIAM Sign-In Node/Express Sample (External ID)

This sample follows Microsoft guidance for Microsoft Entra External ID (external tenant) with MSAL Node and Express.

## Official Microsoft docs

- [Set up the Node.js app (project structure, dependencies, UI)](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-app-node-sign-in-prepare-app)
- [Add sign-in/sign-out logic (MSAL config, routes)](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-app-node-sign-in-sign-out)
- [External ID overview (recommended CIAM platform)](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview)
- [Add Google as a social identity provider (External ID)](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-google-federation-customers)

## Run locally

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies: `npm install`
3. Start the app: `npm start`
4. Open: [http://localhost:3000](http://localhost:3000)

## Marketplace notes

- Microsoft recommends Microsoft Entra External ID for new customer apps.
  [Learn more](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview)
