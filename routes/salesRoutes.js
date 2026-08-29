import express from "express";
import {
  createSale,
  getBuyers,
  getSales,
  deleteSale,
} from "../controllers/salesController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createSale);
router.post("/createInvoice", protect, createSale);
router.get("/buyers", protect, getBuyers);
router.get("/", protect, getSales);
router.delete("/:id", protect, deleteSale);

export default router;