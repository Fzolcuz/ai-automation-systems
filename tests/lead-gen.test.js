import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMessage } from "../src/lead-gen/quality-checks.js";

test("a personal, factual message passes", () => {
  const r = checkMessage("Hello Maria,\n\nI saw your shop on Main Street stocks bridal sets in 14K gold. We make bridal sets to your design. Would a short catalogue of our 14K range be useful?");
  assert.equal(r.ok, true, r.problems.join(", "));
});

test("invented clients, prices, turnaround promises and exclamation marks are blocked", () => {
  const r = checkMessage("We already work with partners across the United States. Prices from $40 per gram, delivered in 10 days!");
  assert.ok(r.problems.includes("claims existing clients in a place"));
  assert.ok(r.problems.includes("mentions a price"));
  assert.ok(r.problems.includes("promises a turnaround time"));
  assert.ok(r.problems.includes("uses an exclamation mark"));
});

test("banned words and template openers are caught; 'feel free to' is allowed", () => {
  const r = checkMessage("Hi,\n\nRetailers across the region are struggling, which means it is time to elevate your range. Feel free to reply.");
  assert.ok(r.problems.some((p) => p.startsWith("generic opener")));
  assert.ok(r.problems.includes("banned word: elevate"));
  assert.ok(!r.problems.some((p) => p.includes("free")));
});
