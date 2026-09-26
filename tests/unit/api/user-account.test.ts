import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, DELETE } from "@/app/api/user/account/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/db", () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const delChain = {
    where: vi.fn().mockResolvedValue([]),
  };
  const tx = { delete: vi.fn().mockReturnValue(delChain) };
  return {
    db: {
      select: vi.fn().mockReturnValue(chain),
      delete: vi.fn().mockReturnValue(delChain),
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => fn(tx)),
      __tx: tx,
      __delChain: delChain,
      __selectChain: chain,
    },
  };
});

type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>;

const dbMock = db as unknown as {
  transaction: ReturnType<typeof vi.fn>;
  __tx: { delete: ReturnType<typeof vi.fn> };
  __delChain: { where: ReturnType<typeof vi.fn> };
  __selectChain: { where: ReturnType<typeof vi.fn> };
};

describe("User Account API Endpoint — RA 10173 Portability & Erasure (/api/user/account)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET (Right to Data Portability)", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as unknown as SessionData);

      const res = await GET(new Request("http://localhost:3000/api/user/account"));
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toMatch(/Authentication required/);
    });

    it("returns 200 with exported user profile and exam history citing RA 10173", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: "u-456",
          name: "Maria Santos",
          email: "maria@example.ph",
          createdAt: new Date("2026-09-01"),
        },
        session: { id: "s-456", userId: "u-456" },
      } as unknown as SessionData);

      const res = await GET(new Request("http://localhost:3000/api/user/account"));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.legalNotice).toMatch(/Republic Act No\. 10173/);
      expect(data.user.email).toBe("maria@example.ph");
      expect(data.data).toBeDefined();
      expect(data.warnings).toEqual([]);
    });

    it("surfaces a warning instead of silently omitting data when a read fails", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u-456", name: "Maria Santos", email: "maria@example.ph" },
        session: { id: "s-456", userId: "u-456" },
      } as unknown as SessionData);
      dbMock.__selectChain.where.mockRejectedValueOnce(new Error("read failed"));

      const res = await GET(new Request("http://localhost:3000/api/user/account"));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.warnings)).toBe(true);
      expect(data.warnings.length).toBeGreaterThan(0);
      expect(data.warnings[0]).toMatch(/may be missing/);
    });
  });

  describe("DELETE (Right to Erasure)", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as unknown as SessionData);

      const res = await DELETE(new Request("http://localhost:3000/api/user/account", { method: "DELETE" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 confirming permanent erasure under RA 10173", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: "u-456",
          name: "Maria Santos",
          email: "maria@example.ph",
        },
        session: { id: "s-456", userId: "u-456" },
      } as unknown as SessionData);

      const res = await DELETE(new Request("http://localhost:3000/api/user/account", { method: "DELETE" }));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/permanently erased/);
      expect(data.message).toMatch(/10173/);
      // Erasure runs in a single all-or-nothing transaction.
      expect(dbMock.transaction).toHaveBeenCalled();
      expect(dbMock.__tx.delete).toHaveBeenCalledTimes(6);
    });

    it("rolls back the whole erasure when any delete fails mid-transaction", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "u-456", name: "Maria Santos", email: "maria@example.ph" },
        session: { id: "s-456", userId: "u-456" },
      } as unknown as SessionData);
      dbMock.__delChain.where.mockRejectedValueOnce(new Error("connection lost"));

      const res = await DELETE(new Request("http://localhost:3000/api/user/account", { method: "DELETE" }));
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data.error).toMatch(/was not deleted/);
    });
  });
});
