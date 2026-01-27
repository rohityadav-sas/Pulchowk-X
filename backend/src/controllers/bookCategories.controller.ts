import { Request, Response } from "express";
import {
    createCategory,
    getAllCategories,
    updateCategory,
    getCategoryById,
    getSubCategories,
    deleteCategory
} from "../services/bookCategories.service.js";


export const CreateCategory = async (req: Request, res: Response) => {
    try {
        const { name, description, parentCategoryId } = req.body;

        if (!name) {
            return res.json({
                success: false,
                message: "Category name is required",
            });
        }

        const result = await createCategory({
            name,
            description,
            parentCategoryId,
        });

        if (!result.success) {
            return res.json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in CreateCategory controller:", error);

        return res.json({
            success: false,
            message: "An error occurred while creating category.",
        });
    }
};

export const GetAllCategories = async (req: Request, res: Response) => {
    try {
        const result = await getAllCategories();

        if (!result.success) {
            return res.json(result);
        }

        return res.json(result);

    } catch (error) {
        console.error("Error in GetAllCategories controller:", error);
        return res.json({
            success: false,
            message: "An error occurred while fetching categories.",
        });
    }
}

export const GetCategoriesById = async (req: Request, res: Response) => {
    try {
        const categoryId = parseInt(req.params.id);

        if (isNaN(categoryId)) {
            return res.json({
                success: false,
                message: "Valid category ID is required.",
            });
        }

        const result = await getCategoryById(categoryId);

        if (!result.success) {
            return res.json(result);
        }

        return res.json(result);

    } catch (error) {
        console.error("Error in GetCategoriesById controller:", error);
        return res.json({
            success: false,
            message: "An error occurred while fetching category.",
        });
    }
}

export const GetSubCategories = async (req: Request, res: Response) => {
    try {
        const parentCategoryId = parseInt(req.params.id);

        if (isNaN(parentCategoryId)) {
            return res.json({
                success: false,
                message: "Valid parent category ID is required.",
            });
        }

        const result = await getSubCategories(parentCategoryId);

        if (!result.success) {
            return res.json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetSubCategories controller:", error);
        return res.json({
            success: false,
            message: "An error occurred while fetching sub-categories.",
        });
    }
}

export const UpdateCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = parseInt(req.params.id);
        const { name, description, parentCategoryId } = req.body;

        if (isNaN(categoryId)) {
            return res.json({
                success: false,
                message: "Valid category ID is required.",
            });
        };

        const result = await updateCategory(categoryId, {
            name,
            description,
            parentCategoryId,
        });

        if (!result.success) {
            return res.json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in updateCategory controller:", error);
        return res.json({
            success: false,
            message: "An error occurred while updating category.",
        });
    };
};

export const DeleteCategory = async (req: Request, res: Response) => {
    try {
        const categoryId = parseInt(req.params.id);
        if (isNaN(categoryId)) {
            return res.json({
                success: false,
                message: "Valid category ID is required.",
            });
        }

        const result = await deleteCategory(categoryId);

        if (!result.success) {
            return res.json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in DeleteCategory controller:", error);
        return res.json({
            success: false,
            message: "An error occurred while deleting category.",
        });
    }
}