import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { db } from "../lib/db.js";
import { user, account } from "../models/auth-schema.js";
import { eq, and } from "drizzle-orm";
import ENV from "../config/ENV.js";

const getAuthToken = (req: Request): string | null => {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice("Bearer ".length).trim();
    }

    const queryToken = req.query.token as string | undefined;
    return queryToken || null;
};

const loadFirebaseServiceAccount = () => {
    try {
        if (ENV.FIREBASE_SERVICE_ACCOUNT_JSON) {
            return JSON.parse(ENV.FIREBASE_SERVICE_ACCOUNT_JSON);
        }
    } catch (error) {
        console.error("Failed to load Firebase service account:", error);
    }

    return null;
};

const getFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        return admin;
    }

    const serviceAccount = loadFirebaseServiceAccount();
    if (!serviceAccount) {
        return null;
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    return admin;
};

const verifyFirebaseToken = async (token: string) => {
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
        return null;
    }

    try {
        return await firebaseAdmin.auth().verifyIdToken(token);
    } catch (error) {
        console.warn("Firebase token verification failed:", error);
        return null;
    }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (session) {
        (req as any).user = session.user;
        (req as any).session = session.session;
        return next();
    }

    const token = getAuthToken(req);
    if (token) {
        // First try Firebase token verification
        try {
            const decoded = await verifyFirebaseToken(token);

            if (decoded) {
                let dbUser = await db.query.user.findFirst({
                    where: eq(user.id, decoded.uid),
                });

                if (!dbUser) {
                    // If not found by ID, check if there's a linked account
                    const linkedAccount = await db.query.account.findFirst({
                        where: and(
                            eq(account.providerId, "firebase"),
                            eq(account.accountId, decoded.uid)
                        )
                    });

                    if (linkedAccount) {
                        dbUser = await db.query.user.findFirst({
                            where: eq(user.id, linkedAccount.userId),
                        });
                    }
                }

                if (!dbUser && decoded.email) {
                    dbUser = await db.query.user.findFirst({
                        where: eq(user.email, decoded.email),
                    });
                    
                    if (dbUser) {
                        console.warn(`[Auth] User ${dbUser.id} identified by email fallback. Missing Firebase account link for UID: ${decoded.uid}`);
                    }
                }

                if (dbUser) {
                    (req as any).user = dbUser;
                    (req as any).session = { userId: dbUser.id, authType: "firebase", firebaseUid: decoded.uid };
                    return next();
                }
            }
        } catch (error) {
            console.error("Firebase token verification error:", error);
        }
    }

    return res.status(401).json({ message: "Unauthorized" });
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (session) {
        (req as any).user = session.user;
        (req as any).session = session.session;
    } else {
        const token = getAuthToken(req);

        if (token) {
            // First try Firebase token verification
            try {
                const decoded = await verifyFirebaseToken(token);
                if (decoded) {
                    let dbUser = await db.query.user.findFirst({
                        where: eq(user.id, decoded.uid),
                    });

                    if (!dbUser) {
                        const linkedAccount = await db.query.account.findFirst({
                            where: and(
                                eq(account.providerId, "firebase"),
                                eq(account.accountId, decoded.uid)
                            )
                        });

                        if (linkedAccount) {
                            dbUser = await db.query.user.findFirst({
                                where: eq(user.id, linkedAccount.userId),
                            });
                        }
                    }

                    if (!dbUser && decoded.email) {
                        dbUser = await db.query.user.findFirst({
                            where: eq(user.email, decoded.email),
                        });
                    }

                    if (dbUser) {
                        (req as any).user = dbUser;
                        (req as any).session = { userId: dbUser.id, authType: "firebase", firebaseUid: decoded.uid };
                    }
                }
            } catch (error) {
                console.error("Firebase token verification error in optionalAuth:", error);
            }
        }
    }

    next();
};

export const requireFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = getAuthToken(req);
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    (req as any).firebaseUser = decoded;
    return next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    // Ensure requireAuth is run first
    let userFromReq = (req as any).user;

    if (!userFromReq) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    // If session role is not admin, perform a fresh DB check to avoid staleness
    if (userFromReq.role !== "admin") {
        try {
            const freshUser = await db.query.user.findFirst({
                where: eq(user.id, userFromReq.id),
                columns: { role: true },
            });

            if (freshUser?.role === "admin") {
                // Update the request user object with the fresh role
                userFromReq.role = "admin";
            }
        } catch (error) {
            console.error("Error performing fresh admin role check:", error);
        }
    }

    if (userFromReq.role !== "admin") {
        console.warn(`Admin access denied for user ${userFromReq.id} (${userFromReq.email}). Role: ${userFromReq.role}`);
        return res.status(403).json({ 
            success: false, 
            message: "Access forbidden: Administrator privileges required." 
        });
    }

    next();
};

export const requireTeacher = async (req: Request, res: Response, next: NextFunction) => {
    let userFromReq = (req as any).user;

    if (!userFromReq) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    // If session role is not teacher, perform a fresh DB check to avoid staleness
    if (userFromReq.role !== "teacher") {
        try {
            const freshUser = await db.query.user.findFirst({
                where: eq(user.id, userFromReq.id),
                columns: { role: true },
            });

            if (freshUser?.role === "teacher") {
                userFromReq.role = "teacher";
            }
        } catch (error) {
            console.error("Error performing fresh teacher role check:", error);
        }
    }

    if (userFromReq.role !== "teacher") {
        console.warn(`Teacher access denied for user ${userFromReq.id} (${userFromReq.email}). Role: ${userFromReq.role}`);
        return res.status(403).json({ 
            success: false, 
            message: "Access forbidden: Teacher privileges required." 
        });
    }

    next();
};
