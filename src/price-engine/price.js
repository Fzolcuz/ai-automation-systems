// Price Engine: how one design's four prices (18K, 14K, 9K gold and 925 silver) are worked out each day.
// Extracted from the SJF Gold Live website code. No AI touches a price: a price must be exact and the
// same every time, so it comes from fixed rules and today's verified rates (see rates.cjs).
//
// Only the METAL part of a price moves with the market. Making charges and stones never move.

// Today's movement: (today's metal in rupees) / (the same at the manager's reference rates).
export function marketFactors(rates, anchor) {
  return {
    gold: (rates.gold * rates.usd_inr) / (anchor.gold_usd_oz * anchor.usd_inr),
    silver: (rates.silver * rates.usd_inr) / (anchor.silver_usd_oz * anchor.usd_inr),
  };
}

// Centre diamonds are priced by carat slab (e.g. up to 0.5 ct, up to 1 ct...).
export function centreValue(carats, slabs) {
  if (!carats) return 0;
  const slab = slabs.find((s) => carats <= s.max_ct + 1e-9) || slabs[slabs.length - 1];
  return Math.round(carats * slab.rate);
}

// One metal line of a design: metal value at reference rates (m0) moved by today's factor,
// plus the fixed making charge (mk), plus fixed stones (st), plus an optional centre diamond.
export function price({ m0, mk, st = 0 }, factor, centre = 0) {
  return Math.round(m0 * factor) + mk + st + centre;
}
