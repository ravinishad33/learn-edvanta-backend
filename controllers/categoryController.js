const Category = require("../models/categoryModel");
const SubCategory = require("../models/subCategoryModel");
const Course=require("../models/courseModel")


//  Create new category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const exists = await Category.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name,
      description,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
Get all categories
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({
      order: 1,
    });

    const updatedCategories = await Promise.all(
      categories.map(async (category) => {
        const count = await Course.countDocuments({
          category: category._id,
        });

        return {
          ...category.toObject(),
          courseCount: count,
        };
      })
    );

    res.json(updatedCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};






const getAllActiveCategories = async (req, res) => {
  try {
    const categories = await Category.find({isActive:true}).sort({
      order: 1,
    });

    const updatedCategories = await Promise.all(
      categories.map(async (category) => {
        const count = await Course.countDocuments({
          category: category._id,
        });

        return {
          ...category.toObject(),
          courseCount: count,
        };
      })
    );

    res.json(updatedCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};











/**
Get single category with subcategories
 */
const getCategoryWithSubCategories = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subCategories = await SubCategory.find({
      categoryId: category._id,
      isActive: true,
    });

    res.json({ category, subCategories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * @desc    Update category
 */
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update name and description if provided
    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;

    if (req.body.name) {
      category.slug = req.body.name.toLowerCase().replace(/\s+/g, "-");
    }

    // Update isActive if provided
    if (req.body.isActive !== undefined) {
      category.isActive = req.body.isActive;

      // If category is deactivated, also deactivate all subcategories
      if (req.body.isActive === false) {
        await SubCategory.updateMany(
          { categoryId: category._id },
          { $set: { isActive: false } }
        );
      }
    }

    const updatedCategory = await category.save();
    res.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};  


/**
 Delete category
 */

// DELETE /api/category/:id
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if any courses are assigned to this category
    const courseCount = await Course.countDocuments({ category: categoryId });
    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${courseCount} course(s) are assigned to it.`,
      });
    }

    // Check if any subcategories exist under this category
    const subcategoryCount = await SubCategory.countDocuments({ categoryId: categoryId });
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${subcategoryCount} subcategory(s) belong to it.`,
      });
    }

    // Safe deletion
    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



module.exports={createCategory,
  getAllCategories,
  getAllActiveCategories,
  getCategoryWithSubCategories,
  updateCategory,
  deleteCategory
}