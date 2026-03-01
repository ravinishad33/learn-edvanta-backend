const express = require("express");
const router = express.Router();
const {
  createSubCategory,
  getSubCategoriesByCategoryId,
  getAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
} = require("../controllers/subCategoryController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { userRole } = require("../middlewares/roleMiddleware");

router.post("/", verifyToken, userRole("admin"), createSubCategory);
router.get("/:categoryId", getSubCategoriesByCategoryId);
router.get("/", getAllSubCategories);


// Update subcategory
router.put("/:id", verifyToken, userRole("admin"), updateSubCategory);

// Delete subcategory
router.delete("/:id", verifyToken, userRole("admin"), deleteSubCategory);

module.exports = router;
