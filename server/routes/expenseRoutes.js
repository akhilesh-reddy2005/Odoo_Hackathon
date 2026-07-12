const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', expenseController.getAllExpenses);
router.post('/', checkPermission('expenses'), expenseController.createExpense);

module.exports = router;
