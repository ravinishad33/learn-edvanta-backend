const express=require("express");
const {register, login, getMe, syncAuth0User, updatePassword, resetPassword}=require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const verifyAuth0Token=require("../middlewares/verifyAuth0Token")


const router=express.Router();


router.post("/register",register);
router.post("/login",login);

router.put("/password",verifyToken,updatePassword);

router.post("/reset-password", resetPassword);


router.get("/getMe",verifyToken,getMe);

router.post("/sync",verifyAuth0Token,syncAuth0User);






module.exports=router;