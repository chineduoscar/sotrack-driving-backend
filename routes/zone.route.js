import express from "express";
import { getAllZones, getSingleZone } from "../controllers/zone.controller.js";

const router = express.Router();

router.get("/", getAllZones);
router.get("/:id", getSingleZone);

export default router;
