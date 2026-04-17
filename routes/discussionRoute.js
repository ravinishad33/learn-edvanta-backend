const express = require("express")
const router = express.Router()
const controller = require("../controllers/discussionController")
const { verifyToken } = require("../middlewares/authMiddleware")

// create post
router.post("/post", verifyToken, controller.createPost)

// reply
router.post("/reply", verifyToken, controller.replyToPost)

// get all discussions
router.get("/:courseId", verifyToken, controller.getDiscussions)

// upvote
router.post("/upvote/:id", verifyToken, controller.toggleUpvote)

// delete
router.delete("/:id", verifyToken, controller.deleteDiscussion)

// edit
router.put("/:id", verifyToken, controller.editDiscussion); 

module.exports = router