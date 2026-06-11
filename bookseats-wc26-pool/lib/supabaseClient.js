import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// `configured` lets the UI show a friendly setup message instead of crashing
// when the environment variables haven't been added yet.
export const configured = Boolean(url && anon);

export const supabase = configured
  ? createClient(url, anon, { realtime: { params: { eventsPerSecond: 5 } } })
  : null;
