const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');

router.post('auth/register',UserController.Register);
router.post('auth/login',UserController.Login);

module.exports = router;