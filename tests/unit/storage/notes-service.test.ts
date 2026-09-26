import { beforeEach, describe, expect, it } from "vitest";
import { NotesService, NOTES_STORAGE_KEY } from "@/lib/storage/notes-service";
import { LocalStorageService } from "@/lib/storage";

describe("NotesService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty for a new visitor", () => {
    expect(NotesService.getAll()).toEqual([]);
    expect(NotesService.count()).toBe(0);
  });

  it("creates, updates, and deletes notes", () => {
    const note = NotesService.create({ title: "Percent change", body: "Divide by the OLD value.", subject: "Numerical Ability" });
    expect(NotesService.count()).toBe(1);
    expect(note.subject).toBe("Numerical Ability");

    NotesService.update(note.id, { title: "Percent change shortcut" });
    expect(NotesService.getAll()[0].title).toBe("Percent change shortcut");

    NotesService.remove(note.id);
    expect(NotesService.count()).toBe(0);
  });

  it("pins notes to the top", () => {
    const a = NotesService.create({ title: "A" });
    NotesService.create({ title: "B" });
    NotesService.update(a.id, { pinned: true });
    const titles = NotesService.getAll().map((n) => n.title);
    expect(titles[0]).toBe("A");
  });

  it("searches title, body, and subject", () => {
    NotesService.create({ title: "Analogy strategy", body: "State the relationship in one sentence.", subject: "Verbal Ability" });
    NotesService.create({ title: "RA 6713", body: "Eight norms of conduct.", subject: "General Information" });

    expect(NotesService.search("analogy")).toHaveLength(1);
    expect(NotesService.search("norms")).toHaveLength(1);
    expect(NotesService.search("verbal")).toHaveLength(1);
    expect(NotesService.search("zzz")).toHaveLength(0);
    expect(NotesService.search("")).toHaveLength(2);
  });

  it("round-trips through backup payloads", () => {
    NotesService.create({ title: "Keep me", body: "body", subject: "General" });
    const exported = NotesService.exportForBackup();
    window.localStorage.removeItem(NOTES_STORAGE_KEY);
    expect(NotesService.count()).toBe(0);

    NotesService.importFromBackup(exported);
    expect(NotesService.count()).toBe(1);
    expect(NotesService.getAll()[0].title).toBe("Keep me");
  });

  it("import tolerates garbage and merges without losing existing notes", () => {
    const existing = NotesService.create({ title: "Existing" });
    NotesService.importFromBackup([
      { id: existing.id, title: "Updated by backup", body: "", subject: "General", pinned: false, createdAt: "", updatedAt: "" },
      { id: "note_x", title: "From backup", body: "b", subject: "Verbal Ability", pinned: true, createdAt: "", updatedAt: "" },
      null,
      "junk",
      42,
    ]);
    expect(NotesService.count()).toBe(2);
    const titles = NotesService.getAll().map((n) => n.title).sort();
    expect(titles).toEqual(["From backup", "Updated by backup"]);
    // Pinned note floats to top
    expect(NotesService.getAll()[0].title).toBe("From backup");
  });

  it("is swept by clearAllGuestData (RA 10173 reset)", () => {
    NotesService.create({ title: "Temp" });
    LocalStorageService.clearAllGuestData();
    expect(NotesService.count()).toBe(0);
  });

  it("sweeps the onboarding state key too (review: rt_onboarding_v1 coverage)", () => {
    window.localStorage.setItem(
      "rt_onboarding_v1",
      JSON.stringify({ version: 1, status: "completed", currentStep: "finish", maxStepReached: "finish", answers: { identityMode: "guest" }, updatedAt: new Date().toISOString() })
    );
    LocalStorageService.clearAllGuestData();
    expect(window.localStorage.getItem("rt_onboarding_v1")).toBeNull();
  });

  it("creates well-formed notes when called with no arguments", () => {
    const note = NotesService.create();
    expect(note.subject).toBe("General");
    expect(note.pinned).toBe(false);
    expect(note.id).toMatch(/^note_/);
  });
});
