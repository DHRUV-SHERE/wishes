import { ConvexError } from "convex/values";

// Server messages written with ConvexError are safe to show; anything else gets a generic text.
export function errMsg(e: unknown, fallback = "Something went wrong") {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  return fallback;
}
