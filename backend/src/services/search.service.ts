import { and, eq, ilike, notInArray, or } from "drizzle-orm";
import locationData from "../data/campus_data.json" with { type: "json" };
import { db } from "../lib/db.js";
import { bookListings } from "../models/book_buy_sell-schema.js";
import { clubs, events } from "../models/event-schema.js";
import { notice } from "../models/notice-schema.js";
import { getBlockedUserIds } from "./trust.service.js";

interface SearchInput {
  query: string;
  limit?: number;
  userId?: string;
}

export async function globalSearch(input: SearchInput) {
  const query = input.query?.trim();
  const limit = Math.max(1, Math.min(25, input.limit ?? 6));

  if (!query || query.length < 2) {
    return {
      success: true,
      data: {
        query: query ?? "",
        clubs: [],
        events: [],
        books: [],
        notices: [],
        places: [],
        total: 0,
      },
    };
  }

  const term = `%${query}%`;
  const blockedUserIds = input.userId ? await getBlockedUserIds(input.userId) : [];

  const [clubResults, eventResults, noticeResults, bookResults] = await Promise.all([
    db.query.clubs.findMany({
      where: or(ilike(clubs.name, term), ilike(clubs.description, term)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit,
      columns: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
      },
    }),

    db.query.events.findMany({
      where: or(
        ilike(events.title, term),
        ilike(events.description, term),
        ilike(events.eventType, term),
        ilike(events.venue, term),
      ),
      orderBy: (table, { desc }) => [desc(table.eventStartTime)],
      limit,
      columns: {
        id: true,
        title: true,
        description: true,
        eventStartTime: true,
        eventEndTime: true,
        venue: true,
        clubId: true,
      },
      with: {
        club: {
          columns: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    }),

    db.query.notice.findMany({
      where: or(ilike(notice.title, term), ilike(notice.content, term)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit,
      columns: {
        id: true,
        title: true,
        content: true,
        section: true,
        subsection: true,
        attachmentUrl: true,
        createdAt: true,
      },
    }),

    db.query.bookListings.findMany({
      where:
        blockedUserIds.length > 0
          ? and(
              eq(bookListings.status, "available"),
              notInArray(bookListings.sellerId, blockedUserIds),
              or(
                ilike(bookListings.title, term),
                ilike(bookListings.author, term),
                ilike(bookListings.isbn, term),
                ilike(bookListings.description, term),
              ),
            )
          : and(
              eq(bookListings.status, "available"),
              or(
                ilike(bookListings.title, term),
                ilike(bookListings.author, term),
                ilike(bookListings.isbn, term),
                ilike(bookListings.description, term),
              ),
            ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit,
      columns: {
        id: true,
        title: true,
        author: true,
        price: true,
        status: true,
        sellerId: true,
      },
      with: {
        images: {
          columns: {
            imageUrl: true,
          },
          limit: 1,
        },
        seller: {
          columns: {
            id: true,
            name: true,
            image: true,
            isVerifiedSeller: true,
          },
        },
      },
    }),
  ]);

  const normalizedTerm = query.toLowerCase();
  const places = (locationData as any).buildings
    .filter((building: any) => {
      const text = [
        building.name,
        building.description,
        ...(building.services ?? []).map((service: any) => service.name),
        ...(building.services ?? []).map((service: any) => service.purpose),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(normalizedTerm);
    })
    .slice(0, limit)
    .map((building: any) => ({
      id: building.id,
      name: building.name,
      description: building.description,
      coordinates: building.coordinates,
      services: (building.services ?? []).slice(0, 3),
    }));

  return {
    success: true,
    data: {
      query,
      clubs: clubResults,
      events: eventResults,
      books: bookResults,
      notices: noticeResults,
      places,
      total:
        clubResults.length +
        eventResults.length +
        bookResults.length +
        noticeResults.length +
        places.length,
    },
  };
}

