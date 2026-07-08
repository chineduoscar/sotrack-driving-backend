import express from "express";
import {
  createContact,
  getAllContacts,
  getSingleContact,
  deleteContact,
} from "../controllers/contact.controller.js";

const router = express.Router();

router.post("/", createContact);
router.get("/", getAllContacts);
router.get("/:id", getSingleContact);
router.delete("/:id", deleteContact);

export default router;
