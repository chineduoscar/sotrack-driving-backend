import express from "express";
import {
  getAllStudents,
  getSingleStudent,
  deleteStudent,
} from "../controllers/student.controller.js";
import { authorize, authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, authorize("admin", "superadmin"), getAllStudents);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  getSingleStudent,
);
router.delete("/:id", authenticate, authorize("superadmin"), deleteStudent);

export default router;
