const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
    res.render('index', {
        title: 'MSAL Node & Express Web App',
        isAuthenticated: req.session.isAuthenticated,
        username:
            req.session.account?.username !== ''
                ? req.session.account?.username
                : req.session.account?.name,
    });
});

module.exports = router;
