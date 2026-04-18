// @ts-nocheck
// Data access layer for the `deals` table. Keeps the Supabase API calls
// centralized so the pipeline component doesn't need to know about SQL.

import { supabase } from "./supabase";

// ------- Fetch all deals owned by the current user -------
export async function listDeals() {
  const { data, error } = await supabase
    .from("deals")
    .select("id, data, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  // Unwrap the JSONB data column — the rest of the app expects a flat deal object
  return (data || []).map((row) => ({
    ...row.data,
    id: Number(row.id), // bigint comes back as string in JS
  }));
}

// ------- Insert or update a deal -------
// Uses upsert so the same function handles both "new deal" and "edit existing"
// paths. Caller supplies the deal object; we extract id and store the rest as
// JSONB.
export async function upsertDeal(deal, userId) {
  if (!deal?.id) throw new Error("Deal is missing id");
  const { error } = await supabase
    .from("deals")
    .upsert(
      {
        id: deal.id,
        user_id: userId,
        data: deal,
      },
      { onConflict: "id" },
    );
  if (error) throw error;
}

// ------- Delete one or more deals -------
export async function deleteDeals(ids) {
  if (!ids || ids.length === 0) return;
  const { error } = await supabase.from("deals").delete().in("id", ids);
  if (error) throw error;
}

// ------- Subscribe to real-time changes for this user -------
// Returns the channel so the caller can unsubscribe on unmount.
export function subscribeToDeals(userId, handler) {
  const channel = supabase
    .channel(`deals-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "deals",
        filter: `user_id=eq.${userId}`,
      },
      handler,
    )
    .subscribe();
  return channel;
}

// ------- First-login migration -------
// If the user has deals sitting in localStorage (pre-Supabase data), push them
// to the server and clear localStorage. Only runs once per account per device —
// we set a sentinel in localStorage after a successful migration.
export async function migrateLocalStorageIfNeeded(userId) {
  const sentinelKey = `brev_migrated_${userId}`;
  if (localStorage.getItem(sentinelKey)) return { migrated: 0, skipped: true };

  const raw = localStorage.getItem("brev_deals");
  if (!raw) {
    localStorage.setItem(sentinelKey, "1");
    return { migrated: 0, skipped: true };
  }

  let localDeals;
  try {
    localDeals = JSON.parse(raw);
  } catch {
    localStorage.setItem(sentinelKey, "1");
    return { migrated: 0, skipped: true };
  }

  // Drop drafts and anything without an id. Older deals that predate the
  // timestamp-id convention get a fresh id here.
  const rows = (localDeals || [])
    .filter((d) => d && !d.isDraft)
    .map((d) => ({
      id: Number(d.id) || Date.now() + Math.floor(Math.random() * 1000),
      user_id: userId,
      data: { ...d, isDraft: false },
    }));

  if (rows.length === 0) {
    localStorage.setItem(sentinelKey, "1");
    return { migrated: 0, skipped: true };
  }

  const { error } = await supabase
    .from("deals")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
  localStorage.setItem(sentinelKey, "1");
  // Keep the old localStorage around as a safety net — we can clean it up once
  // the user has been running on Supabase for a while. The sentinel prevents
  // repeated migrations.
  return { migrated: rows.length, skipped: false };
}
