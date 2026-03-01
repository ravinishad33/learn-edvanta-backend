const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { updateProfile, updateAvatar } = require('../controllers/userController');
const { upload } = require('../middlewares/multerMiddleware');



// update user
router.put('/me',verifyToken, updateProfile);


router.put('/avatar',verifyToken,upload.single("avatar"),updateAvatar);


module.exports=router;