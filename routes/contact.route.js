import express from "express";
import {
  createContact,
  getAllContacts,
  getSingleContact,
} from "../controllers/contact.controller.js";

const router = express.Router();

router.post("/", createContact);
router.get("/", getAllContacts);
router.get("/:id", getSingleContact);

export default router;
