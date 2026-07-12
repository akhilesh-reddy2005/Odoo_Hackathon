const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.post('/login', authController.login);
router.post('/logout', (req, res) => res.json({ message: 'Logout successful.' }));

router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

router.get('/roles', authMiddleware, checkRole(['Admin']), authController.getRoles);
router.put('/roles', authMiddleware, checkRole(['Admin']), authController.updateRolePermissions);

module.exports = router;
