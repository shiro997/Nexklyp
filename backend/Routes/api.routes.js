const express = require('express');
const router = express.Router();
const Auth = require('./User.routes');

router.use('/V1/api/',Auth);

module.exports = router;