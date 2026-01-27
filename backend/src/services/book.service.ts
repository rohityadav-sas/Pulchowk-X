import { db } from "../lib/db.js";
 import { and, desc, eq } from "drizzle-orm"
import { savedBooks, bookListings } from "../models/book_buy_sell-schema.js";


export const saveBook = async(
    userId: string,
    listingId: number,
    notes?: string
) => {
    try{
        const existing = await db.query.savedBooks
        .findFirst({
            where: and(
                eq(savedBooks.userId, userId),
                eq(savedBooks.listingId, listingId)
            ),
        });

        if(existing){
            return {
                success: false,
                message: "Book already saved."
            }
        }

        const listing = await db.query.bookListings
        .findFirst({
            where: eq(bookListings.id, listingId),
            });
        
            if(!listing){
                return {
                    success: false,
                    message: "Book listing not found.",
                }
            }

            const [savedBook] = await db
             .insert(savedBooks)
             .values({
                userId,
                listingId,
                notes
             })
             .returning();

            return {
                success: true,
                data: savedBook,
                message: "Book saved to wishlist",
            };
    }catch(error){
        console.error("Error saving book:", error);
        return {
            success: false,
            message: "Failed to save book",
        };
    };
};

export const unsaveBook = async(
    userId: string,
    lisgtingId: number
) => {
    try{
        const result = await db
         .delete(savedBooks)
         .where(
            and(
                eq(savedBooks.userId, userId),
                eq(savedBooks.listingId, lisgtingId)
            )
         )
         .returning();
            
        if(result.length === 0){
            return {
                success: false,
                message: "Saved book not found.",
            };
        }

        return {
            success: true,
            message: "Book removed from wishList",
        };         
    } catch(error){
        console.error("Error unsaving book:", error);
        return {
            success: false,
            message: "Failed to remove book from wishlist",
        };
    };
};

export const getUserSavedBooks = async(
    userId: string
) => {
    try{
        const saved = await db.query.savedBooks
        .findMany({
            where: eq(savedBooks.userId, userId),
            with: {
                listing: {
                    with: {
                        seller: {
                            columns: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                        images: {
                            limit: 1
                        },
                        category: true,
                    },
                },
            },
            orderBy: desc(savedBooks.createdAt),
        });

        return {
            success: true,
            data: saved,
        };
    } catch (error) {
        console.error("Error fetching saved books:", error);

        return {
            success: false,
            error: "Failed to fetch saved books",
        };
    }
};

export const updateSavedBooksNotes = async(
    userId: string,
    lisgtingId: number,
    notes: string
) => {
    try{
        const [updated] = await db
          .update(savedBooks)
          .set({
            notes,
            updatedAt: new Date(),
          })
          .where(
            and(
                eq(savedBooks.userId, userId),
                eq(savedBooks.listingId, lisgtingId)
            )
          )
          .returning();

          if(!updated) {
            return {
                success: false,
                message: "Saved book not found.",
            };
        }

        return {
            success: true,
            data: updated,
            message: "Notes updated successfully.",
        }

    }catch(error){
      console.error("Error updating saved book notes:", error);

      return {
        success: false,
        message: "Failed to update notes.",
      };
    }
};

export const isBookSaved = async (
    userId: string,
    listingId: number
) => {
    try{
        const saved = await db.query.savedBooks
        .findFirst({
            where: and(
                eq(savedBooks.userId, userId),
                eq(savedBooks.listingId, listingId)
            ),
        });

        return {
            success: true,
            data: !!saved,
        };
    } catch (error) {
        console.error("Error checking if book is saved:", error);

        return {
            success: false,
            error: "Failed to check if book is saved",
        };
    }
}

export const getSavedBooksCount = async (
    userId: string
) => {
    try {
        const saved = await db.query.savedBooks
         .findMany({
            where: eq(savedBooks.userId, userId),
         });

         return {
            success: true,
            data: {
                count: saved.length,
            },
         };
    } catch (error) {
        console.error("Error getting saved books count:", error);

        return {
            success: false,
            error: "Failed to get saved books count",
        };
    }
}