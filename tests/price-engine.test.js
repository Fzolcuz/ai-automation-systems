import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { marketFactors, price, centreValue } from "../src/price-engine/price.js";
const { _test: { believable, pick } } = createRequire(import.meta.url)("../src/price-engine/rates.cjs");

const ref = { gold: 4000, silver: 50, usd_inr: 88, gbp_inr: 115 };

test("a gold spike of more than 40% in a day is thrown away", () => {
  assert.equal(believable("gold", 4100, ref), true);
  assert.equal(believable("gold", 6000, ref), false);
  assert.equal(believable("gold", 0, ref), false);
  assert.equal(believable("usd_inr", 1, ref), false);
});

test("two sources that disagree by more than 5%: the one closer to the saved rate wins", async () => {
  const r = await pick("gold", [["a", async () => 3000], ["b", async () => 4050]], ref);
  assert.equal(r.src, "b");
});

test("a source that errors is skipped, the next one is used", async () => {
  const r = await pick("gold", [["down", async () => { throw new Error("HTTP 500"); }], ["ok", async () => 4010]], ref);
  assert.equal(r.src, "ok");
});

test("only the metal part of a price moves with the market", () => {
  const f = marketFactors({ gold: 4400, silver: 50, usd_inr: 88 }, { gold_usd_oz: 4000, silver_usd_oz: 50, usd_inr: 88 });
  assert.equal(price({ m0: 40000, mk: 3600, st: 5000 }, f.gold), 44000 + 3600 + 5000);
});

test("centre diamonds are priced by carat slab", () => {
  const slabs = [{ max_ct: 0.5, rate: 10000 }, { max_ct: 1, rate: 15000 }];
  assert.equal(centreValue(0.4, slabs), 4000);
  assert.equal(centreValue(0.8, slabs), 12000);
});
