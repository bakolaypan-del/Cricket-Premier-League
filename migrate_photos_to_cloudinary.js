/**
 * Bulk Photo Migration: ImgBB/External → Cloudinary
 *
 * HOW TO USE:
 * 1. Open your live CPL site in a browser
 * 2. Open browser DevTools Console (F12 → Console)
 * 3. Paste this entire script and press Enter
 * 4. Run: window.migratePhotos()
 *
 * It will:
 * - Fetch all players from Firebase RTDB
 * - Download each photo from ImgBB/external URLs
 * - Re-upload to Cloudinary with compression
 * - Output UPDATE SQL to patch Supabase records with new Cloudinary URLs
 * - Also update Firebase records with new URLs
 *
 * OR run in Node.js: node migrate_photos_to_cloudinary.js
 * (Node.js mode generates SQL only, doesn't update Firebase)
 */

const FIREBASE_DB_URL = "https://cpl-jsl-2026-default-rtdb.firebaseio.com";
const CLOUDINARY_CLOUD_NAME = "k483yjqc";
const CLOUDINARY_UPLOAD_PRESET = "cpl_uploads";

function makeUUID(input) {
  let hash = 0;
  const str = String(input);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const base = hex.repeat(4).substring(0, 32);
  return `${base.slice(0,8)}-${base.slice(8,12)}-4${base.slice(13,16)}-a${base.slice(17,20)}-${base.slice(20,32)}`;
}

function isCloudinaryUrl(url) {
  return url && typeof url === 'string' && url.includes('cloudinary.com');
}

function isExternalPhotoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('assets/') || url.startsWith('./') || url.startsWith('data:')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

async function fetchAsBlob(url) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  } catch (e) {
    // Try with no-cors proxy fallback
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      return await res.blob();
    } catch (e2) {
      console.warn(`  ✗ Cannot fetch: ${url}`, e2.message);
      return null;
    }
  }
}

async function uploadToCloudinary(blob, fileName, folderName = 'player_photos') {
  try {
    const formData = new FormData();
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `jsl_2026/${folderName}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.secure_url) {
        return data.secure_url;
      }
    } else {
      const errTxt = await response.text();
      console.warn(`  ✗ Cloudinary upload failed: ${response.status}`, errTxt);
    }
  } catch (err) {
    console.warn(`  ✗ Cloudinary upload error:`, err.message);
  }
  return null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migratePhotos() {
  console.log("🔄 Fetching all players from Firebase...");

  const res = await fetch(`${FIREBASE_DB_URL}/cpl_master/players.json`);
  if (!res.ok) {
    console.error("❌ Failed to fetch players from Firebase");
    return;
  }
  const playersData = await res.json();
  if (!playersData) {
    console.error("❌ No players found in Firebase");
    return;
  }

  const players = Array.isArray(playersData)
    ? playersData.filter(Boolean)
    : Object.values(playersData).filter(Boolean);

  console.log(`📋 Found ${players.length} players total`);

  // Filter players with external non-Cloudinary photo URLs
  const toMigrate = players.filter(p => {
    const url = p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '';
    return isExternalPhotoUrl(url) && !isCloudinaryUrl(url);
  });

  const alreadyOnCloudinary = players.filter(p => {
    const url = p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '';
    return isCloudinaryUrl(url);
  });

  const noPhoto = players.filter(p => {
    const url = p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '';
    return !isExternalPhotoUrl(url);
  });

  console.log(`☁️  Already on Cloudinary: ${alreadyOnCloudinary.length}`);
  console.log(`📷 Need migration (ImgBB/external): ${toMigrate.length}`);
  console.log(`🚫 No external photo URL: ${noPhoto.length}`);

  if (toMigrate.length === 0) {
    console.log("✅ All photos are already on Cloudinary or local. Nothing to migrate!");
    return;
  }

  const results = { success: 0, failed: 0, skipped: 0 };
  const sqlUpdates = [];
  const firebaseUpdates = [];

  sqlUpdates.push('-- =============================================');
  sqlUpdates.push('-- Photo Migration: ImgBB → Cloudinary URL Updates');
  sqlUpdates.push(`-- Generated: ${new Date().toISOString()}`);
  sqlUpdates.push(`-- Players to migrate: ${toMigrate.length}`);
  sqlUpdates.push('-- =============================================');
  sqlUpdates.push('BEGIN;');
  sqlUpdates.push('');

  for (let i = 0; i < toMigrate.length; i++) {
    const player = toMigrate[i];
    const oldUrl = player.hdPhotoUrl || player.photoUrl || player.player_photo_url;
    const playerName = player.name || 'Unknown';
    const playerId = player.id || `player-${i}`;
    const supabaseId = makeUUID(playerId);

    console.log(`\n[${i + 1}/${toMigrate.length}] ${playerName} (${playerId})`);
    console.log(`  Old URL: ${oldUrl}`);

    // Download from ImgBB/external
    const blob = await fetchAsBlob(oldUrl);
    if (!blob) {
      console.log(`  ⚠️ SKIPPED — could not download`);
      results.skipped++;
      continue;
    }

    console.log(`  📥 Downloaded: ${(blob.size / 1024).toFixed(1)} KB`);

    // Upload to Cloudinary
    const safeName = playerName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `player_${safeName}_${Date.now()}.jpg`;
    const newUrl = await uploadToCloudinary(blob, fileName, 'player_photos');

    if (!newUrl) {
      console.log(`  ❌ FAILED — Cloudinary upload failed`);
      results.failed++;
      continue;
    }

    console.log(`  ✅ Cloudinary: ${newUrl}`);
    results.success++;

    // Generate SQL update for Supabase
    sqlUpdates.push(`-- Player: ${playerName} (${playerId})`);
    sqlUpdates.push(`UPDATE public.players SET photo_url = ${esc(newUrl)}, updated_at = now() WHERE id = ${esc(supabaseId)};`);

    // Also update person_profiles if phone exists
    const phone = (player.phone || player.mobile || '').replace(/[^0-9]/g, '');
    if (phone && phone.length >= 10) {
      sqlUpdates.push(`UPDATE public.person_profiles SET photo_url = ${esc(newUrl)}, updated_at = now() WHERE phone = ${esc(phone)};`);
    }

    // Queue Firebase update (browser-only)
    firebaseUpdates.push({ playerId, newUrl });

    // Rate limit: 500ms between uploads to avoid Cloudinary throttling
    if (i < toMigrate.length - 1) {
      await sleep(500);
    }
  }

  sqlUpdates.push('');
  sqlUpdates.push('COMMIT;');
  sqlUpdates.push(`-- Results: ${results.success} migrated, ${results.failed} failed, ${results.skipped} skipped`);

  // Update Firebase records with new Cloudinary URLs
  if (firebaseUpdates.length > 0 && typeof window !== 'undefined') {
    console.log(`\n🔄 Updating ${firebaseUpdates.length} Firebase records with new Cloudinary URLs...`);
    for (const { playerId, newUrl } of firebaseUpdates) {
      try {
        await fetch(`${FIREBASE_DB_URL}/cpl_master/players/${playerId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl: newUrl,
            hdPhotoUrl: newUrl,
            player_photo_url: newUrl,
            photoMigratedToCloudinary: true,
            photoMigratedAt: Date.now()
          })
        });
      } catch (e) {
        console.warn(`  Firebase update failed for ${playerId}:`, e.message);
      }
    }
    console.log("✅ Firebase records updated.");
  }

  // Output results
  const sqlOutput = sqlUpdates.join('\n');

  console.log("\n========================================");
  console.log("📊 MIGRATION COMPLETE");
  console.log("========================================");
  console.log(`✅ Successfully migrated: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Skipped (download failed): ${results.skipped}`);
  console.log(`📋 Total processed: ${toMigrate.length}`);
  console.log("========================================");
  console.log("\n📋 Copy the SQL below and run in Supabase SQL Editor:\n");
  console.log(sqlOutput);

  // Try clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(sqlOutput);
      console.log("\n📋 SQL copied to clipboard!");
    } catch (e) {}
  }

  return sqlOutput;
}

// Auto-setup
if (typeof window !== 'undefined') {
  window.migratePhotos = migratePhotos;
  console.log("📸 Photo Migration Script loaded.");
  console.log("   Run: window.migratePhotos()");
} else {
  // Node.js mode - needs node-fetch
  console.log("⚠️ This script is designed to run in the browser console on your live CPL site.");
  console.log("   Open your site → F12 → Console → paste this script → run window.migratePhotos()");
  console.log("   Browser mode is needed because Cloudinary upload requires FormData/File APIs.");
}
