const Discussion = require("../models/discussionModel");
const { User } = require("../models/userModel");

//  Create a new Post 
exports.createPost = async (req, res) => {
  try {
    const { course, text } = req.body;

    if (!course || !text) {
      return res.status(400).json({ message: "Course ID and text are required" });
    }

    const user = await User.findById(req.user.userId).select("name role avatar");

    const newPost = await Discussion.create({
      course,
      text,
      user: req.user.userId,
    });

    // Manually construct payload for Socket.io to include fresh user details
    const postPayload = {
      ...newPost.toObject(),
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    };

    const io = req.app.get("io");
    // Emit to the course room
    if (io) io.to(course.toString()).emit("new_post", postPayload);

    res.status(201).json(postPayload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Reply to a Post
exports.replyToPost = async (req, res) => {
  try {
    const { course, parentId, text } = req.body;

    const user = await User.findById(req.user.userId).select("name role avatar");

    const newReply = await Discussion.create({
      course,
      parentId,
      text,
      user: req.user.userId,
    });

    const replyPayload = {
      ...newReply.toObject(),
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    };

    const io = req.app.get("io");
    if (io) io.to(course.toString()).emit("new_reply", replyPayload);

    res.status(201).json(replyPayload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




//  Get All Discussions for a Course
exports.getDiscussions = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Fetch posts and replies simultaneously with populated user info
    const [posts, replies] = await Promise.all([
      Discussion.find({ course: courseId, parentId: null })
        .populate("user", "name role avatar")
        .sort({ createdAt: -1 })
        .lean(),
      Discussion.find({ course: courseId, parentId: { $ne: null } })
        .populate("user", "name role avatar")
        .lean()
    ]);

    // Nest replies inside their parent posts
    const result = posts.map(post => ({
      ...post,
      replies: replies.filter(r => r.parentId.toString() === post._id.toString())
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Toggle Upvote
exports.toggleUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const discussion = await Discussion.findById(id);
    if (!discussion) return res.status(404).json({ message: "Not found" });

    const index = discussion.upvotes.indexOf(userId);
    if (index === -1) {
      discussion.upvotes.push(userId);
    } else {
      discussion.upvotes.splice(index, 1);
    }

    await discussion.save(); // pre-save hook updates upvoteCount

    const io = req.app.get("io");
    if (io) {
      io.to(discussion.course.toString()).emit("update_upvote", {
        id: discussion._id,
        upvoteCount: discussion.upvoteCount
      });
    }

    res.json({ upvoteCount: discussion.upvoteCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Edit Post/Reply
exports.editDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const discussion = await Discussion.findById(id);
    if (discussion.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    discussion.text = text;
    discussion.isEdited = true;
    discussion.editedAt = Date.now();
    await discussion.save();

    const io = req.app.get("io");
    if (io) {
      io.to(discussion.course.toString()).emit("edit_message", {
        id: discussion._id,
        text: discussion.text,
        isEdited: true,
        editedAt: discussion.editedAt
      });
    }

    res.json(discussion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Hard Delete (Cascading)
exports.deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const discussion = await Discussion.findById(id);

    if (!discussion) return res.status(404).json({ message: "Not found" });
    if (discussion.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const courseId = discussion.course;

    // Delete the post/reply
    await discussion.deleteOne();

    // If it was a parent post, delete all associated replies
    if (!discussion.parentId) {
      await Discussion.deleteMany({ parentId: id });
    }

    const io = req.app.get("io");
    if (io) io.to(courseId.toString()).emit("delete_message", { id });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};