import "@testing-library/jest-dom";
import { vi } from "vitest";

// next/font/google is a build-time transform, not a runtime module: mock it so
// suites that import layout metadata don't crash in Vitest. The shape mirrors
// what the real factory returns (className + variables).
vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ className: "mock-font-display", variable: "--font-display" }),
  Figtree: () => ({ className: "mock-font-body", variable: "--font-body" }),
}));

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = () => "";
}

// Global mock for better-auth client to prevent hanging network calls and nanostores teardown errors
vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  },
  useSession: () => ({
    data: null,
    isPending: false,
    refetch: vi.fn(),
  }),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));
