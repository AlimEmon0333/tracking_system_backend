import express from "express";
import {
  createParty,
  getParties,
  getPartyById,
  updateParty,
  deleteParty,
} from "../controllers/partyController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createParty);

router.get("/", protect, getParties);

router.get("/:id", protect, getPartyById);

router.put("/:id", protect, updateParty);

router.delete("/:id", protect, deleteParty);

export default router;