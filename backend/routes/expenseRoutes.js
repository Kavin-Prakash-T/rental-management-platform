import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createExpense,
  getExpenses,
  getExpenseSummary,
  getExpenseById,
  updateExpense,
  voidExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
  voidExpenseSchema,
  getExpensesQuerySchema,
  expenseSummaryQuerySchema,
} from "../validators/expenseValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createExpenseSchema }),
  createExpense
);

router.get(
  "/",
  authenticate,
  validate({ query: getExpensesQuerySchema }),
  getExpenses
);

router.get(
  "/summary",
  authenticate,
  validate({ query: expenseSummaryQuerySchema }),
  getExpenseSummary
);

router.get(
  "/:id",
  authenticate,
  validate({ params: expenseIdParamSchema }),
  getExpenseById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: expenseIdParamSchema, body: updateExpenseSchema }),
  updateExpense
);

router.post(
  "/:id/void",
  authenticate,
  csrfProtection,
  validate({ params: expenseIdParamSchema, body: voidExpenseSchema }),
  voidExpense
);

router.delete(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: expenseIdParamSchema }),
  deleteExpense
);

export default router;
