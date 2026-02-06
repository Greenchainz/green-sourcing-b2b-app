const express = require('express');
const router = express.Router();
const authProvider = require('../auth/AuthProvider');
const { GRAPH_ME_ENDPOINT } = require('../authConfig');
const { fetch } = require('../fetch');

function isAuthenticated(req, res, next) {
    if (!req.session.isAuthenticated) {
        return res.redirect('/auth/signin');
    }

    next();
}

router.get('/id', isAuthenticated, async function (req, res) {
    res.render('id', { idTokenClaims: req.session.account.idTokenClaims });
});

router.get(
    '/profile',
    isAuthenticated,
    authProvider.getToken(['User.Read']),
    async function (req, res) {
        const graphResponse = await fetch(GRAPH_ME_ENDPOINT, req.session.accessToken);

        if (!graphResponse.id) {
            return res.status(501).send('Failed to fetch profile details');
        }

        res.render('profile', {
            profile: graphResponse,
        });
    }
);

module.exports = router;
