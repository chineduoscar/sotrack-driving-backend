import express from "express";
import {
  getAllStudents,
  getSingleStudent,
  deleteStudent,
} from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", getAllStudents);
router.get("/:id", getSingleStudent);
router.delete("/:id", deleteStudent);

export default router;
