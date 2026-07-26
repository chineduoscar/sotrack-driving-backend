import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  getCurrentUser,
  getAllUsers,
  getUserById,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);
router.get("/", authenticate, authorize("admin", "superadmin"), getAllUsers);
router.get("/:id", authenticate, authorize("admin", "superadmin"), getUserById);
router.delete("/:id", authenticate, authorize("superadmin"), deleteUser);

export default router;
