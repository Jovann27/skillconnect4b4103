import express from "express";
import { totalsReport, demographicsReport, skillsReport, skilledPerTrade, mostBookedServices, totalsOverTime } from "../controllers/reportsController.js";

const router = express.Router();
router.get("/totals", totalsReport);
router.get("/demographics", demographicsReport);
router.get("/skills", skillsReport);
router.get("/skilled-per-trade", skilledPerTrade);
router.get("/most-booked-services", mostBookedServices);
router.get('/totals-over-time', totalsOverTime);

export default router;
