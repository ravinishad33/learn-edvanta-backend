const express = require("express");
const {
    generateCertificate,
    downloadCertificateByCourse
} = require("../controllers/certificateController");
const { userRole } = require('../middlewares/roleMiddleware');
const { verifyToken } = require("../middlewares/authMiddleware");
const router = express.Router();


router.post("/generate", verifyToken, userRole("student"), generateCertificate);
router.get("/download/course/:courseId", verifyToken,userRole("student"), downloadCertificateByCourse);

module.exports = router;