const express = require("express");
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryWithSubCategories,
  updateCategory,
  deleteCategory,
  getAllActiveCategories,
} = require("../controllers/categoryController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { userRole } = require("../middlewares/roleMiddleware");

router.post("/", verifyToken, userRole("admin"), createCategory);
router.get("/", getAllCategories);
router.get("/active", getAllActiveCategories);

router.get("/:id", getCategoryWithSubCategories);
router.put("/:id", verifyToken,userRole("admin"), updateCategory);
router.delete("/:id",verifyToken,userRole("admin"), deleteCategory);

module.exports = router;
