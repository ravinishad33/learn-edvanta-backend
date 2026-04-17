const SubCategory = require("../models/subCategoryModel");
const Category=require("../models/categoryModel")
const Course=require("../models/courseModel")
/**
  Create subcategory
 */
exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res
        .status(400)
        .json({ message: "Name and categoryId are required" });
    }

    const subCategory = await SubCategory.create({
      name,
      categoryId,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    });

    res.status(201).json(subCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 Get subcategories by category

 */
exports.getSubCategoriesByCategoryId = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({
      categoryId: req.params.categoryId,
      isActive: true,
    });

    res.json(subCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find()
      .populate("categoryId", "name");

    if (!subCategories || subCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subcategories found",
      });
    }

    // Add courseCount to each subcategory
    const updatedSubCategories = await Promise.all(
      subCategories.map(async (sub) => {
        const count = await Course.countDocuments({
          subcategory: sub._id,
        });

        return {
          ...sub.toObject(),
          courseCount: count,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: updatedSubCategories.length,
      subCategories: updatedSubCategories,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// Update subcategory
exports.updateSubCategory = async (req, res) => {
  try {
    const { name, categoryId, isActive } = req.body;

    const subcategory = await SubCategory.findById(req.params.id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    // Update name and slug
    if (name) {
      subcategory.name = name;
      subcategory.slug = name.toLowerCase().replace(/\s+/g, "-");
    }

    let parentCategory;

    // Update category if provided
    if (categoryId) {
      parentCategory = await Category.findById(categoryId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }
      subcategory.categoryId = categoryId;
    } else {
      parentCategory = await Category.findById(subcategory.categoryId);
    }

    // Check parent category status
    if (!parentCategory.isActive) {
      subcategory.isActive = false;
      await subcategory.save();
      return res.status(400).json({
        success: false,
        message: `Cannot activate subcategory. Parent category "${parentCategory.name}" is inactive.`,
        subcategory,
      });
    }

    // Update isActive if allowed
    if (isActive !== undefined) {
      subcategory.isActive = isActive;
    }

    await subcategory.save();

    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      subcategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





exports.deleteSubCategory = async (req, res) => {
  try {
    const subcategoryId = req.params.id;

    const subcategory = await SubCategory.findById(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    //  Check if any courses are using this subcategory
    const courseCount = await Course.countDocuments({
      subcategory: subcategoryId,
    });

    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete subcategory. ${courseCount} course(s) are assigned to it.`,
      });
    }

    await subcategory.deleteOne();

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};