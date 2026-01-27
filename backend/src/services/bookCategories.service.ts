import { db } from "../lib/db.js";
import { eq, desc, isNull } from "drizzle-orm";
import { bookCategories } from "../models/book_buy_sell-schema.js";

export const createCategory = async (data: {
    name: string;
    description?: string;
    parentCategoryId?: number;
}) => {
    try {
        if (data.parentCategoryId) {
            const parent = await db.query.bookCategories
                .findFirst({
                    where: eq(bookCategories.id, data.parentCategoryId),
                });

            if (!parent) {
                return {
                    success: false,
                    message: "Parent category not found."
                };
            }
        };

        const [category]: any = await db
            .insert(bookCategories)
            .values({
                name: data.name,
                description: data.description,
                parentCategoryId: data.parentCategoryId,
            })
            .returning();

        return {
            success: true,
            data: category,
            message: "Category created successfully.",
        };
    } catch (error) {
        console.error("Error creating category:", error);

        return {
            success: false,
            error: "Failed to create category.",
        };
    }
};

export const getAllCategories = async () => {
    try {
        const categories = await db.query.bookCategories
            .findMany({
                orderBy: [bookCategories.name],
                with: {
                    parentCategory: true,
                    subcategories: true,
                },
            });

        return {
            success: true,
            data: categories,
        };

    } catch (error) {
        console.error("Error fetching categories:", error);

        return {
            success: false,
            message: "Failed to fetch categories",
        };
    }
};

export const getCategories = async () => {
    try {
        const categories = await db.query.bookCategories
            .findMany({
                where: isNull(bookCategories.parentCategoryId),
                orderBy: desc(bookCategories.createdAt),
                with: {
                    subcategories: true,
                },
            });

        return {
            success: true,
            data: categories,
        };

    } catch (error) {
        console.error("Error fetching categories:", error);

        return {
            success: false,
            message: "Failed to fetch categories",
        };
    };
};

export const getCategoryById = async (categoryId: number) => {
    try {
        const category = await db.query.bookCategories
            .findFirst({
                where: eq(bookCategories.id, categoryId),
                with: {
                    parentCategory: true,
                    subcategories: true,
                    bookListings: {
                        limit: 10,
                        with: {
                            images: {
                                limit: 1,
                            },
                        },
                    },
                },
            });

        if (!category) {
            return {
                success: false,
                message: "Category not found",
            };
        }

        return {
            success: true,
            data: category,
        };
    } catch (error) {
        console.error("Error fetching category by ID:", error);

        return {
            success: false,
            message: "Failed to fetch category",
        };
    }
}

export const getSubCategories = async (parentCategoryId: number) => {
    try {
        const subcategories = await db.query.bookCategories
            .findMany({
                where: eq(bookCategories.parentCategoryId, parentCategoryId),
                orderBy: desc(bookCategories.createdAt),
            });

        return {
            success: true,
            data: subcategories,
        };
    } catch (error) {
        console.error("Error fetching subcategories:", error);
        return {
            success: false,
            message: "Failed to fetch subcategories",
        };
    }
}

export const updateCategory = async (
    categoryId: number,
    data: Partial<{
        name: string;
        description: string;
        parentCategoryId: number;
    }>
) => {
    try {
        const existing = await db.query.bookCategories
            .findFirst({
                where: eq(bookCategories.id, categoryId),
            });

        if (!existing) {
            return {
                success: false,
                message: "Category not found.",
            };
        }

        if (data.parentCategoryId) {
            const parent = await db.query.bookCategories
                .findFirst({
                    where: eq(bookCategories.id, data.parentCategoryId),
                });

            if (!parent) {
                return {
                    success: false,
                    message: "Parent category not found.",
                };
            }

            if (data.parentCategoryId === categoryId) {
                return {
                    success: false,
                    message: "A category cannot be its own parent.",
                };
            }
        }

        const [updated]: any = await db
            .update(bookCategories)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(bookCategories.id, categoryId))
            .returning();

        return {
            success: true,
            data: updated,
            message: "Category updated successfully.",
        };
    } catch (error) {
        console.error("Error updating category:", error);

        return {
            success: false,
            message: "Failed to update category.",
        };
    };
};

export const deleteCategory = async (categoryId: number) => {
    try {
        const subcategories = await db.query.bookCategories
            .findMany({
                where: eq(bookCategories.parentCategoryId, categoryId),
            });

        if (subcategories.length > 0) {
            return {
                success: false,
                message: "Cannot delete category with existing subcategories.",
            };
        }

        const category = await db.query.bookCategories
            .findFirst({
                where: eq(bookCategories.id, categoryId),
                with: {
                    bookListings: true,
                },
            });


        if (category) {
            return {
                success: false,
                message: "Cannot delete category with associated book listings.",
            };
        }

        await db
            .delete(bookCategories)
            .where(eq(bookCategories.id, categoryId));

        return {
            success: true,
            message: "Category deleted successfully.",
        };
    } catch (error) {
        console.error("Error deleting category:", error);

        return {
            success: false,
            message: "Failed to delete category.",
        };
    }
}

