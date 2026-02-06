require('dotenv').config();

const TENANT_SUBDOMAIN = process.env.TENANT_SUBDOMAIN || 'Enter_the_Tenant_Subdomain_Here';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/redirect';
const POST_LOGOUT_REDIRECT_URI = process.env.POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000';
const GRAPH_ME_ENDPOINT =
    (process.env.GRAPH_API_ENDPOINT || 'Enter_the_Graph_Endpoint_Here') + 'v1.0/me';

const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID || 'Enter_the_Application_Id_Here',
        authority: process.env.AUTHORITY || `https://${TENANT_SUBDOMAIN}.ciamlogin.com/`,
        // authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
        clientSecret: process.env.CLIENT_SECRET || 'Enter_the_Client_Secret_Here',
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: 'Info',
        },
    },
};

module.exports = {
    msalConfig,
    REDIRECT_URI,
    POST_LOGOUT_REDIRECT_URI,
    TENANT_SUBDOMAIN,
    GRAPH_ME_ENDPOINT,
};
