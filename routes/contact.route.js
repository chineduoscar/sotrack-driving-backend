import express from "express";
import {
  createContact,
  getAllContacts,
  getSingleContact,
  deleteContact,
} from "../controllers/contact.controller.js";
import { authorize, authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createContact);
router.get("/", authenticate, authorize("admin", "superadmin"), getAllContacts);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  getSingleContact,
);
router.delete("/:id", authenticate, authorize("superadmin"), deleteContact);

export default router;
