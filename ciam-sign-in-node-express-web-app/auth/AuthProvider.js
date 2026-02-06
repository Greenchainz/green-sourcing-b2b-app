const msal = require('@azure/msal-node');
const axios = require('axios');
const {
    msalConfig,
    REDIRECT_URI,
    POST_LOGOUT_REDIRECT_URI,
} = require('../authConfig');

class AuthProvider {
    constructor(config) {
        this.config = config;
        this.cryptoProvider = new msal.CryptoProvider();
    }

    getMsalInstance(msalConfig) {
        return new msal.ConfidentialClientApplication(msalConfig);
    }

    async login(req, res, next, options = {}) {
        req.session.csrfToken = this.cryptoProvider.createNewGuid();

        const state = this.cryptoProvider.base64Encode(
            JSON.stringify({
                csrfToken: req.session.csrfToken,
                redirectTo: '/',
            })
        );

        const authCodeUrlRequestParams = {
            state: state,
            scopes: [],
        };

        const authCodeRequestParams = {
            state: state,
            scopes: [],
        };

        if (!this.config.msalConfig.auth.authorityMetadata) {
            const authorityMetadata = await this.getAuthorityMetadata();
            this.config.msalConfig.auth.authorityMetadata = JSON.stringify(authorityMetadata);
        }

        const msalInstance = this.getMsalInstance(this.config.msalConfig);

        return this.redirectToAuthCodeUrl(
            req,
            res,
            next,
            authCodeUrlRequestParams,
            authCodeRequestParams,
            msalInstance
        );
    }

    async handleRedirect(req, res, next) {
        const authCodeRequest = {
            ...req.session.authCodeRequest,
            code: req.body.code,
            codeVerifier: req.session.pkceCodes.verifier,
        };

        try {
            const msalInstance = this.getMsalInstance(this.config.msalConfig);
            msalInstance.getTokenCache().deserialize(req.session.tokenCache);

            const tokenResponse = await msalInstance.acquireTokenByCode(authCodeRequest, req.body);

            req.session.tokenCache = msalInstance.getTokenCache().serialize();
            req.session.idToken = tokenResponse.idToken;
            req.session.account = tokenResponse.account;
            req.session.isAuthenticated = true;

            const state = JSON.parse(this.cryptoProvider.base64Decode(req.body.state));
            res.redirect(state.redirectTo);
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        // const logoutUri = `${this.config.msalConfig.auth.authority}${TENANT_SUBDOMAIN}.onmicrosoft.com/oauth2/v2.0/logout?post_logout_redirect_uri=${this.config.postLogoutRedirectUri}`;

        const logoutUri = `${this.config.msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${this.config.postLogoutRedirectUri}`;
        req.session.destroy(() => {
            res.redirect(logoutUri);
        });
    }

    async redirectToAuthCodeUrl(
        req,
        res,
        next,
        authCodeUrlRequestParams,
        authCodeRequestParams,
        msalInstance
    ) {
        const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();

        req.session.pkceCodes = {
            challengeMethod: 'S256',
            verifier: verifier,
            challenge: challenge,
        };

        req.session.authCodeUrlRequest = {
            ...authCodeUrlRequestParams,
            redirectUri: this.config.redirectUri,
            responseMode: 'form_post',
            codeChallenge: req.session.pkceCodes.challenge,
            codeChallengeMethod: req.session.pkceCodes.challengeMethod,
        };

        req.session.authCodeRequest = {
            ...authCodeRequestParams,
            redirectUri: this.config.redirectUri,
            code: '',
        };

        try {
            const authCodeUrlResponse = await msalInstance.getAuthCodeUrl(req.session.authCodeUrlRequest);
            res.redirect(authCodeUrlResponse);
        } catch (error) {
            next(error);
        }
    }

    async getAuthorityMetadata() {
        // const endpoint = `${this.config.msalConfig.auth.authority}${TENANT_SUBDOMAIN}.onmicrosoft.com/v2.0/.well-known/openid-configuration`;

        const endpoint = `${this.config.msalConfig.auth.authority}/v2.0/.well-known/openid-configuration`;
        try {
            const response = await axios.get(endpoint);
            return await response.data;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    getToken(scopes, redirectUri = 'http://localhost:3000/') {
        return async function (req, res, next) {
            const msalInstance = authProvider.getMsalInstance(authProvider.config.msalConfig);
            try {
                msalInstance.getTokenCache().deserialize(req.session.tokenCache);

                const silentRequest = {
                    account: req.session.account,
                    scopes: scopes,
                };
                const tokenResponse = await msalInstance.acquireTokenSilent(silentRequest);

                req.session.tokenCache = msalInstance.getTokenCache().serialize();
                req.session.accessToken = tokenResponse.accessToken;
                next();
            } catch (error) {
                if (error instanceof msal.InteractionRequiredAuthError) {
                    req.session.csrfToken = authProvider.cryptoProvider.createNewGuid();

                    const state = authProvider.cryptoProvider.base64Encode(
                        JSON.stringify({
                            redirectTo: redirectUri,
                            csrfToken: req.session.csrfToken,
                        })
                    );

                    const authCodeUrlRequestParams = {
                        state: state,
                        scopes: scopes,
                    };

                    const authCodeRequestParams = {
                        state: state,
                        scopes: scopes,
                    };

                    return authProvider.redirectToAuthCodeUrl(
                        req,
                        res,
                        next,
                        authCodeUrlRequestParams,
                        authCodeRequestParams,
                        msalInstance
                    );
                }

                next(error);
            }
        };
    }
}

const authProvider = new AuthProvider({
    msalConfig: msalConfig,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI,
});

module.exports = authProvider;
