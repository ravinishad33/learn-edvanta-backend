const express = require("express");
const router = express.Router();
const { getPublicStats } = require("../controllers/statsController");

// from statController routes
router.get("/platform-stats", getPublicStats);

module.exports = router;