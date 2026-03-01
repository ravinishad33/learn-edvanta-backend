const express=require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { getInstructorStats } = require("../controllers/instructorController");
const { userRole } = require("../middlewares/roleMiddleware");

const router=express.Router();


router.get("/stats",verifyToken,userRole("instructor"),getInstructorStats);


module.exports=router;