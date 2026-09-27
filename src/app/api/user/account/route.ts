import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, testAttempts, bookmarks, userProgress, sessions, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * RA 10173 (Philippine Data Privacy Act of 2012) User Account Rights Endpoints:
 * - GET: Right to Data Portability (export cloud account profile & records)
 * - DELETE: Right to Erasure / Blocking (permanently delete account & associated data)
 */

export async function GET(request: Request) {
  try {
    let reqHeaders: Headers;
    try {
      reqHeaders = request?.headers || (await headers());
    } catch {
      reqHeaders = request?.headers || new Headers();
    }

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required to export account data." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user cloud records
    let userAttempts: unknown[] = [];
    let userBookmarks: unknown[] = [];
    const warnings: string[] = [];

    try {
      userAttempts = await db
        .select()
        .from(testAttempts)
        .where(eq(testAttempts.userId, userId));
    } catch (err) {
      // A privacy export must not silently omit data: surface the gap.
      warnings.push("Attempts could not be read from the cloud database and may be missing from this export.");
      console.warn("[AccountAPI] Could not fetch attempts:", err);
    }

    try {
      userBookmarks = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId));
    } catch (err) {
      warnings.push("Bookmarks could not be read from the cloud database and may be missing from this export.");
      console.warn("[AccountAPI] Could not fetch bookmarks:", err);
    }

    return NextResponse.json({
      exportType: "account_privacy_export",
      scope: "cloud_account_data",
      legalNotice: "Exported in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).",
      formatNotice:
        "This file contains your cloud account profile and synchronized server records. For an importable backup of your offline device study sessions, use the Device Backup JSON in Settings > Data & Storage.",
      exportedAt: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        createdAt: session.user.createdAt,
      },
      data: {
        attempts: userAttempts,
        bookmarks: userBookmarks,
      },
      warnings,
    });
  } catch (error) {
    console.error("[AccountAPI] Error exporting account data:", error);
    return NextResponse.json(
      { error: "Failed to export account data." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    let reqHeaders: Headers;
    try {
      reqHeaders = request?.headers || (await headers());
    } catch {
      reqHeaders = request?.headers || new Headers();
    }

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required to delete account." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Perform permanent erasure of user records and related cloud data.
    // RA 10173 erasure must be all-or-nothing: a single transaction so a
    // mid-sequence failure rolls back every delete (the 500 message below —
    // "Account data was not deleted" — is then actually true).
    try {
      await db.transaction(async (tx) => {
        // 1. Delete bookmarks
        await tx.delete(bookmarks).where(eq(bookmarks.userId, userId));
        // 2. Delete user progress
        await tx.delete(userProgress).where(eq(userProgress.userId, userId));
        // 3. Delete test attempts (cascades userAnswers in DB schema)
        await tx.delete(testAttempts).where(eq(testAttempts.userId, userId));
        // 4. Delete sessions and accounts
        await tx.delete(sessions).where(eq(sessions.userId, userId));
        await tx.delete(accounts).where(eq(accounts.userId, userId));
        // 5. Delete user record
        await tx.delete(users).where(eq(users.id, userId));
      });
    } catch (dbErr) {
      console.error("[AccountAPI] DB erasure failed:", dbErr);
      return NextResponse.json(
        { error: "Database error during account erasure. Account data was not deleted." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Account and associated personal study data have been permanently erased in compliance with Republic Act No. 10173 (Data Privacy Act of 2012).",
    });
  } catch (error) {
    console.error("[AccountAPI] Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 }
    );
  }
}
