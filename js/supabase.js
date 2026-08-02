// Supabase Client Integration & Backend Helper (Developer: Suman Kolay)

// Supabase Credentials (Pre-configured placeholder / project URL & Anon key)
const SUPABASE_URL = "https://cricket-premier-league.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaWNrZXQtcGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzI1MzExOTksImV4cCI6MTk4ODEwNzE5OX0.placeholderKey";

export let supabase = null;

if (window.supabase) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized successfully.");
  } catch (err) {
    console.warn("Supabase client init fallback to local store:", err);
  }
}

export async function syncPlayerToSupabase(playerData) {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from('players').insert([playerData]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.log("Supabase sync info (local fallback active):", err.message);
    return null;
  }
}

export async function syncTeamToSupabase(teamData) {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from('teams').insert([teamData]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.log("Supabase sync info (local fallback active):", err.message);
    return null;
  }
}
