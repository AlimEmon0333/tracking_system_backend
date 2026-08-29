import express from "express";
import {
  recordPayment,
  getPayments,
  deletePayment,
  getPaymentDashboardSummary,
} from "../controllers/paymentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, recordPayment);
router.get("/", protect, getPayments);
router.get("/summary", protect, getPaymentDashboardSummary);
router.delete("/:id", protect, deletePayment);

export default router;
