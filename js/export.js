// Export & Printing Utility Module for PDF & CSV (Developer: Suman Kolay - User Guide PDF Release)

import { store } from './store.js?v=13.0.50';
import { toUUID } from './supabase.js?v=13.0.50';

export function getTournamentDocName(overrideTourney = null) {
  if (overrideTourney && overrideTourney.name) return overrideTourney.name;
  if (typeof store !== 'undefined' && store && store.getActiveTournamentName) {
    const name = store.getActiveTournamentName();
    if (name) return name;
  }
  return 'Cricket Premier League';
}

export function exportPlayersToCSV(players) {
  if (!players || players.length === 0) {
    alert('No player data available to export.');
    return;
  }

  const tourneyName = getTournamentDocName();
  const headers = ['Serial No', 'Player ID', 'Full Name', 'Father Name', 'DOB', 'Age', 'Phone', 'Address', 'Category', 'Payment Ref', 'Payment Status', 'Reg Date'];
  const rows = players.map(p => [
    p.displayRegistrationNumber || p.serialNo || '',
    p.registrationId || p.regNo || p.id || '',
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.fatherName || '').replace(/"/g, '""')}"`,
    `"${p.dob || ''}"`,
    p.age || '',
    `"${p.phone || ''}"`,
    `"${(p.address || `${p.village || ''}, ${p.district || ''}`).replace(/"/g, '""')}"`,
    `"${p.category || p.playingType || p.role || ''}"`,
    `"${p.paymentRef || ''}"`,
    (p.registrationStatus || p.paymentStatus || 'PENDING').toUpperCase(),
    p.regDate || ''
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${tourneyName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Registered_Players_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportTeamsToCSV(teams) {
  if (!teams || teams.length === 0) {
    alert('No team data available to export.');
    return;
  }

  const tourneyName = getTournamentDocName();
  const headers = ['Team ID', 'Team Name', 'Short Code', 'Owner Name', 'Owner Phone', 'Co-Owner 1 Name', 'Co-Owner 1 Phone', 'Co-Owner 2 Name', 'Co-Owner 2 Phone', 'Reg Date'];
  const rows = teams.map(t => [
    t.id || '',
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.shortCode || '',
    `"${(t.ownerName || '').replace(/"/g, '""')}"`,
    `"${t.ownerPhone || ''}"`,
    `"${(t.coOwner1Name || t.coOwnerName || '').replace(/"/g, '""')}"`,
    `"${t.coOwner1Phone || t.coOwnerPhone || ''}"`,
    `"${(t.coOwner2Name || '').replace(/"/g, '""')}"`,
    `"${t.coOwner2Phone || ''}"`,
    t.regDate || ''
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${tourneyName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Registered_Teams_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// GENERATE PROFESSIONAL PRINTABLE PDF DOCUMENT FOR REGISTERED TEAMS
export async function exportTeamsToPDF(teams) {
  if (!teams || teams.length === 0) {
    alert('No teams found to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups in your browser to view and print the PDF.');
    return;
  }

  const rowsHtml = teams.map((t, idx) => {
    const co1Name = t.coOwner1Name || t.coOwnerName || '';
    const co1Phone = t.coOwner1Phone || t.coOwnerPhone || '';
    const co1Photo = t.coOwner1PhotoUrl || '';

    const co2Name = t.coOwner2Name || '';
    const co2Phone = t.coOwner2Phone || '';
    const co2Photo = t.coOwner2PhotoUrl || '';

    return `
      <tr>
        <td style="text-align: center; font-weight: bold; font-family: monospace; font-size: 14px;">#${idx + 1}</td>
        <td style="text-align: center; width: 100px; padding: 6px;">
          <div style="width: 85px; height: 85px; background-color: #FFFFFF; border: 2px solid #0F172A; border-radius: 12px; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${t.logoUrl ? `<img src="${t.logoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
          </div>
        </td>
        <td style="font-weight: bold; color: #0F172A; font-size: 15px;">${t.name}</td>
        
        <!-- OWNER -->
        <td style="text-align: center; width: 100px; padding: 6px;">
          <div style="width: 85px; height: 85px; background-color: #FFFFFF; border: 2px solid #D97706; border-radius: 12px; margin: 0 auto; overflow: hidden;">
            ${t.ownerPhotoUrl || t.ownerPhoto ? `<img src="${t.ownerPhotoUrl || t.ownerPhoto}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
          </div>
        </td>
        <td style="font-size: 12px;">
          <strong style="color: #0B192C; font-size: 13px;">${t.ownerName}</strong><br/>
          <span style="font-family: monospace; color: #0284C7; font-weight: bold;">📞 ${t.ownerPhone || 'N/A'}</span>
        </td>

        <!-- CO-OWNER 1 -->
        <td style="text-align: center; width: 100px; padding: 6px;">
          <div style="width: 85px; height: 85px; background-color: #FFFFFF; border: 2px solid #0284C7; border-radius: 12px; margin: 0 auto; overflow: hidden;">
            ${co1Photo ? `<img src="${co1Photo}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
          </div>
        </td>
        <td style="font-size: 12px;">
          ${co1Name ? `<strong style="color: #0284C7;">${co1Name}</strong><br/><span style="font-family: monospace; color: #475569;">📞 ${co1Phone || 'N/A'}</span>` : '<span style="color: #94A3B8;">N/A</span>'}
        </td>

        <!-- CO-OWNER 2 -->
        <td style="text-align: center; width: 100px; padding: 6px;">
          <div style="width: 85px; height: 85px; background-color: #FFFFFF; border: 2px solid #9333EA; border-radius: 12px; margin: 0 auto; overflow: hidden;">
            ${co2Photo ? `<img src="${co2Photo}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
          </div>
        </td>
        <td style="font-size: 12px;">
          ${co2Name ? `<strong style="color: #9333EA;">${co2Name}</strong><br/><span style="font-family: monospace; color: #475569;">📞 ${co2Phone || 'N/A'}</span>` : '<span style="color: #94A3B8;">N/A</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const tourneyName = getTournamentDocName();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${tourneyName} - Registered Teams Directory PDF</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1E293B; }
        .header-box { text-align: center; border-bottom: 3px solid #0F172A; padding-bottom: 15px; margin-bottom: 20px; }
        .title { font-size: 26px; font-weight: 900; color: #0B192C; margin: 0; }
        .subtitle { font-size: 15px; font-weight: bold; color: #0284C7; margin-top: 4px; }
        .meta { font-size: 11px; color: #64748B; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1.5px solid #CBD5E1; padding: 6px; text-align: left; vertical-align: middle; }
        th { background-color: #0F172A; color: white; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 11px; }
        tr:nth-child(even) { background-color: #F8FAFC; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header-box">
        <h1 class="title">${tourneyName.toUpperCase()}</h1>
        <div class="subtitle">Official Registered Teams Directory</div>
        <div class="meta">Generated: ${new Date().toLocaleString()} • Total Registered Teams: ${teams.length}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 35px;">Sl No</th>
            <th style="width: 95px;">Team Logo</th>
            <th>Team Name</th>
            <th style="width: 95px;">Owner Photo</th>
            <th>Owner Details</th>
            <th style="width: 95px;">Co-Owner 1 Photo</th>
            <th>Co-Owner 1 Details</th>
            <th style="width: 95px;">Co-Owner 2 Photo</th>
            <th>Co-Owner 2 Details</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        ${tourneyName} • Official Registration Management System • Developer: Suman Kolay
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };
}

// GENERATE PROFESSIONAL PRINTABLE PDF DOCUMENT WITH LARGE 120x120 FULL HD PLAYER PHOTOS
export async function exportPlayersToPDF(players, filterLabel = 'All Registered Players') {
  if (!players || players.length === 0) {
    alert('No players found to export.');
    return;
  }

  const tourneyName = getTournamentDocName();
  const now = new Date();
  const formattedTimestamp = now.toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // 1. SHOW INTERACTIVE GOOGLE DRIVE HD PHOTO FETCHING POPUP
  const loadingOverlayHtml = `
    <div id="pdf-loading-overlay" class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center space-y-3 animate-fade-in border-2 border-amber-500/60 shadow-2xl">
      <div class="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="space-y-1">
        <span class="px-3 py-1 bg-amber-950 text-amber-300 text-[10px] font-black rounded-full border border-amber-800 uppercase tracking-widest">
          📸 HD Photo PDF Generator
        </span>
        <h3 class="text-base sm:text-xl font-black text-white">Preparing 120x120 HD Player Directory PDF...</h3>
        <p class="text-xs text-slate-300 max-w-xs mx-auto">
          Building printable PDF for <strong>${filterLabel}</strong> (${players.length} players) with Sl No, 120x120 HD Pictures, & Download Timestamp.
        </p>
        <div id="pdf-fetch-progress" class="text-amber-400 font-mono text-xs font-black pt-2">
          Syncing HD photo documents...
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', loadingOverlayHtml);

  try {
    // 2. FETCH FULL UNCOMPRESSED HD PHOTOS FOR EVERY PLAYER
    const playersWithHDPhotos = [];
    const totalPlayers = players.length;

    for (let i = 0; i < totalPlayers; i++) {
      const p = players[i];
      const progressElem = document.getElementById('pdf-fetch-progress');
      if (progressElem) {
        progressElem.innerText = `Processing HD photo ${i + 1} of ${totalPlayers}... (${p.name || 'Player'})`;
      }

      let targetSrc = p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '';
      let hdPhoto = targetSrc;

      if (targetSrc && targetSrc.startsWith('http')) {
        try {
          const res = await fetch(targetSrc, { cache: 'no-store' });
          if (res.ok) {
            const blob = await res.blob();
            hdPhoto = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }
        } catch (err) {
          hdPhoto = targetSrc;
        }
      } else if (targetSrc && targetSrc.startsWith('data:image')) {
        hdPhoto = targetSrc;
      }

      playersWithHDPhotos.push({ ...p, hdPhoto });
    }

    // REMOVE LOADING OVERLAY
    document.getElementById('pdf-loading-overlay')?.remove();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups in your browser to view and print the PDF.');
      return;
    }

    const rowsHtml = playersWithHDPhotos.map((p, idx) => {
      const displayNo = p.displayRegistrationNumber || p.serialNo || (idx + 1);
      const isApproved = (p.registrationStatus || p.paymentStatus) === 'APPROVED';
      const isRejected = (p.registrationStatus || p.paymentStatus) === 'REJECTED';
      const statusLabel = isApproved ? '🟢 APPROVED' : isRejected ? '⚪ REJECTED' : '🔴 PENDING';
      const statusColor = isApproved ? '#059669' : isRejected ? '#475569' : '#DC2626';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; font-family: monospace; font-size: 14px;">#${displayNo}</td>
          <td style="text-align: center; width: 130px; padding: 6px;">
            <div style="width: 120px; height: 120px; background-color: #FFFFFF; border: 2.5px solid #0F172A; border-radius: 14px; margin: 0 auto; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              ${p.hdPhoto ? `<img src="${p.hdPhoto}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
            </div>
          </td>
          <td style="font-weight: bold; color: #0F172A; font-size: 15px;">${p.name}</td>
          <td style="font-family: monospace; font-weight: bold; color: #0284C7; font-size: 13px;">${p.phone || 'N/A'}</td>
          <td style="text-align: center; font-weight: bold; color: #D97706; font-size: 13px;">${p.age || 24} Yrs</td>
          <td style="color: #0F172A; font-weight: bold; font-size: 13px;">${p.category || p.playingType || p.role || 'All Rounder'}</td>
          <td style="font-size: 12px; color: #334155;">${p.village ? `${p.village}, ${p.district || ''}` : p.address || 'Paschim Medinipur'}</td>
          <td style="text-align: center; font-weight: bold; color: ${statusColor}; font-size: 12px;">
            ${statusLabel}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tourneyName} - Registered Players Directory (${filterLabel})</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1E293B; }
          .header-box { text-align: center; border-bottom: 3px solid #0F172A; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 26px; font-weight: 900; color: #0B192C; margin: 0; }
          .subtitle { font-size: 15px; font-weight: bold; color: #D97706; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; margin-top: 8px; font-family: sans-serif; }
          .timestamp-badge { background-color: #F1F5F9; border: 1px solid #CBD5E1; padding: 3px 8px; border-radius: 6px; font-weight: bold; color: #0F172A; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th, td { border: 1.5px solid #CBD5E1; padding: 8px; text-align: left; vertical-align: middle; }
          th { background-color: #0F172A; color: white; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 12px; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1 class="title">${tourneyName.toUpperCase()}</h1>
          <div class="subtitle">Official Registered Players Directory — ${filterLabel}</div>
          <div class="meta">
            <span class="timestamp-badge">📅 Download Date & Time: ${formattedTimestamp}</span>
            <span style="margin-left: 10px;">📊 Total Players: <strong>${players.length}</strong></span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px;">Sl No</th>
              <th style="width: 130px;">Player Picture</th>
              <th>Player Name</th>
              <th style="width: 105px;">Phone Number</th>
              <th style="width: 60px;">Player Age</th>
              <th>Player Category</th>
              <th>Address</th>
              <th style="width: 90px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          ${tourneyName} • Official Registration Management System • Developer: Suman Kolay
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 400);
    };
  } catch (err) {
    document.getElementById('pdf-loading-overlay')?.remove();
    console.error("PDF generation error:", err);
    alert("An error occurred while generating PDF. Please try again.");
  }
}

// PRINT / DOWNLOAD DIGITAL PASS FOR INDIVIDUAL PLAYER (WHITE BACKGROUND & SQUARE SHAPE)
export function printDigitalPass(player, league, team) {
  if (!player) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download your pass.');
    return;
  }

  const serialNo = player.registrationId || player.regNo || 'JSL2026-0001';
  const photoSrc = player.photoUrl || player.player_photo_url || 'assets/jsl_logo_white.jpg';

  const rawDate = player.createdTime || player.regTimestamp || player.regDate || player.created_at || player.registeredAt || player.createdAt || player.timestamp || player.date;
  let regDateTime = 'Registered';
  if (rawDate) {
    const parsedDate = typeof rawDate === 'number' ? new Date(rawDate) : new Date(rawDate);
    if (!isNaN(parsedDate.getTime())) {
      regDateTime = parsedDate.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    }
  }

  const isApproved = player.registrationStatus === 'APPROVED' || player.paymentStatus === 'APPROVED';
  const statusBadgeHtml = isApproved 
    ? `<div class="official-seal" style="background: #ECFDF5; color: #065F46; border: 1.5px solid #10B981;">✅ VERIFIED PASS</div>`
    : `<div class="official-seal" style="background: #FFFBEB; color: #92400E; border: 1.5px solid #F59E0B;">⏳ PENDING VERIFICATION</div>`;

  const tourneyName = getTournamentDocName();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${tourneyName} Player Pass - ${player.name} (${serialNo})</title>
      <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; color: #0F172A; display: flex; flex-direction: column; items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        
        .action-toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
        .action-btn { padding: 10px 20px; font-weight: 800; font-size: 13px; border-radius: 12px; border: none; cursor: pointer; display: inline-flex; items-center; gap: 8px; shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.2s; }
        .btn-png { background: #059669; color: white; }
        .btn-png:hover { background: #047857; }
        .btn-pdf { background: #0F172A; color: white; }
        .btn-pdf:hover { background: #1E293B; }

        /* SQUARE SHAPE CARD DESIGN (WHITE BACKGROUND, 430px x 430px) */
        .pass-card { width: 430px; height: 430px; background: #FFFFFF; border: 3px solid #10B981; border-radius: 24px; padding: 18px; text-align: center; box-shadow: 0 20px 30px rgba(0,0,0,0.12); position: relative; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
        
        /* CARD TOP HEADER STRIP */
        .card-header { background: linear-gradient(135deg, #064E3B 0%, #047857 100%); margin: -18px -18px 12px -18px; padding: 12px 16px; border-bottom: 3px solid #F59E0B; text-align: center; }
        .league-title { font-size: 18px; font-weight: 900; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase; }
        .league-sub { font-size: 10px; font-weight: 800; color: #FDE047; text-transform: uppercase; margin-top: 2px; }

        /* BODY LAYOUT: PHOTO & MAIN INFO */
        .pass-body { display: flex; gap: 14px; text-align: left; items: center; }
        .photo-frame { width: 105px; height: 105px; border-radius: 16px; border: 3px solid #10B981; overflow: hidden; background: #F1F5F9; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
        .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        
        .info-col { flex: 1; }
        
        /* HIGHLIGHTED SERIAL NO BADGE (RED / GOLD HIGHLIGHT) */
        .serial-badge { display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #FFFFFF; font-weight: 900; font-size: 12px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 3px 8px rgba(220,38,38,0.3); border: 1.5px solid #FCA5A5; margin-bottom: 4px; }
        
        .player-name { font-size: 18px; font-weight: 900; color: #0F172A; margin: 2px 0; leading-tight; }
        .player-team { font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; }

        /* DETAILS GRID */
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; background: #F8FAFC; padding: 10px 12px; border-radius: 14px; border: 1.5px solid #E2E8F0; text-align: left; }
        .detail-item { font-size: 8.5px; color: #64748B; font-weight: 800; text-transform: uppercase; }
        .detail-val { font-size: 10.5px; color: #0F172A; font-weight: 900; margin-top: 1px; }

        /* FOOTER STRIP */
        .card-footer { border-top: 1.5px border-dashed #CBD5E1; padding-top: 8px; font-size: 9px; color: #475569; font-weight: 800; display: flex; justify-content: space-between; items: center; }
        .official-seal { padding: 4px 10px; border-radius: 8px; font-weight: 900; font-size: 9.5px; }

        @media print {
          body { background: white; padding: 0; display: block; }
          .action-toolbar { display: none !important; }
          .pass-card { box-shadow: none; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <!-- TOP ACTION BUTTONS BAR -->
      <div class="action-toolbar">
        <button class="action-btn btn-png" id="download-png-btn">
          📥 Download Square PNG Image
        </button>
        <button class="action-btn btn-pdf" id="print-pdf-btn">
          🖨️ Print / Save PDF
        </button>
      </div>

      <!-- WHITE BACKGROUND SQUARE PASS CARD (1:1 RATIO) -->
      <div class="pass-card" id="digital-pass-card">
        
        <!-- HEADER -->
        <div class="card-header">
          <div class="league-title">${tourneyName.toUpperCase()}</div>
          <div class="league-sub">${tourneyName.toUpperCase()} • OFFICIAL DIGITAL PLAYER PASS</div>
        </div>

        <!-- MAIN BODY SECTION -->
        <div class="pass-body">
          <div class="photo-frame">
            <img src="${photoSrc}" alt="${player.name}" />
          </div>
          
          <div class="info-col">
            <!-- HIGHLIGHTED SERIAL NUMBER BADGE -->
            <div class="serial-badge">SERIAL NO: ${serialNo}</div>
            
            <div class="player-name">${player.name}</div>
            <div class="player-team">🏆 ${team ? team.name : `${tourneyName} Registered Player`}</div>
          </div>
        </div>

        <!-- DETAILS GRID WITH REGISTRATION DATE & TIME -->
        <div class="details-grid">
          <div>
            <div class="detail-item">Father Name</div>
            <div class="detail-val">${player.fatherName || 'N/A'}</div>
          </div>
          <div>
            <div class="detail-item">Playing Category</div>
            <div class="detail-val" style="color: #059669;">${player.category || player.playingType || 'All Rounder'}</div>
          </div>
          <div>
            <div class="detail-item">Age / Village</div>
            <div class="detail-val" style="color: #D97706;">${player.age ? player.age + ' Yrs' : ''} ${player.village ? '(' + player.village + ')' : ''}</div>
          </div>
          <div>
            <div class="detail-item">Reg Date & Time</div>
            <div class="detail-val" style="color: #0284C7;">${regDateTime}</div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="card-footer">
          <div>
            📍 Jhankra School Ground • 29-31 Aug 2026<br/>
            Organizer: Pintu Santra (89722144166)
          </div>
          ${statusBadgeHtml}
        </div>

      </div>

      <script>
        document.getElementById('print-pdf-btn').addEventListener('click', () => window.print());

        document.getElementById('download-png-btn').addEventListener('click', () => {
          const card = document.getElementById('digital-pass-card');
          html2canvas(card, { scale: 3, useCORS: true, allowTaint: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Player_Pass_${serialNo}.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          });
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function openUserGuidePDF() {
  const printWindow = window.open('jsl_guide.html', '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    alert("Please allow popups to open the User Guide PDF.");
  }
}

// HELPER: Ultra-Lightweight Image Compressor for PDF Print (Reduces PDF size from 50MB+ down to < 300KB)
async function convertImageToLightweightBase64(url, maxDim = 100, quality = 0.70, fallbackSrc = 'assets/card_jsl_user.png') {
  if (!url || typeof url !== 'string') return fallbackSrc;

  // Helper to draw image to canvas and export compressed JPEG
  const compressFromImgElement = (imgSource) => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        let width = imgSource.naturalWidth || imgSource.width || maxDim;
        let height = imgSource.naturalHeight || imgSource.height || maxDim;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(imgSource, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (e) {
        resolve(url);
      }
    });
  };

  try {
    let sourceToLoad = url;
    let objectUrlToRevoke = null;

    // If HTTP URL, fetch as blob first to prevent CORS tainted canvas
    if (url.startsWith('http')) {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (res.ok) {
          const blob = await res.blob();
          sourceToLoad = URL.createObjectURL(blob);
          objectUrlToRevoke = sourceToLoad;
        }
      } catch (fetchErr) {
        sourceToLoad = url;
      }
    }

    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(url);
      }, 2000);

      img.onload = async () => {
        clearTimeout(timer);
        const result = await compressFromImgElement(img);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(result);
      };

      img.onerror = () => {
        clearTimeout(timer);
        if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        resolve(fallbackSrc);
      };

      img.src = sourceToLoad;
    });
  } catch (err) {
    return url;
  }
}

// HELPER: Prepare structured squad data for a team
export function getTeamFinalSquadData(team, allPlayers) {
  const defaultIconFee = Number(store.getAuctionSettings().defaultIconPrice) || 1000;
  const hasIcon = !!((team.iconPlayerName && team.iconPlayerName.trim()) || (team.iconName && team.iconName.trim()) || (team.iconPlayerId && team.iconPlayerId.trim()));
  const iconRawName = (team.iconPlayerName || team.iconName || '').trim();
  const iconPlayerId = team.iconPlayerId || '';
  
  // Match icon player against registered players
  let iconPlayerObj = allPlayers.find(p => (iconPlayerId && (p.id === iconPlayerId || toUUID(p.id) === toUUID(iconPlayerId))) || (iconRawName && p.name && p.name.trim().toLowerCase() === iconRawName.toLowerCase()));

  let iconItem = null;
  if (hasIcon || iconPlayerObj) {
    iconItem = {
      isIcon: true,
      slNo: 1,
      id: (iconPlayerObj && iconPlayerObj.id) || 'icon-player',
      name: (iconPlayerObj && iconPlayerObj.name) || iconRawName || 'Official Icon Player',
      photoUrl: (iconPlayerObj && (iconPlayerObj.hdPhotoUrl || iconPlayerObj.photoUrl || iconPlayerObj.player_photo_url)) || team.iconPlayerPhotoUrl || team.iconPhotoUrl || team.iconPhoto || '',
      phone: (iconPlayerObj && (iconPlayerObj.phone || iconPlayerObj.mobile)) || team.iconPhone || team.iconPlayerPhone || 'N/A',
      village: (iconPlayerObj && (iconPlayerObj.village ? `${iconPlayerObj.village}${iconPlayerObj.district ? ', ' + iconPlayerObj.district : ''}` : iconPlayerObj.address)) || team.iconVillage || team.iconPlayerVillage || 'Paschim Medinipur',
      category: (iconPlayerObj && (iconPlayerObj.category || iconPlayerObj.playingType || iconPlayerObj.role)) || 'Icon Player',
      price: defaultIconFee,
      priceLabel: `₹ ${defaultIconFee.toLocaleString('en-IN')} (Icon Allocation)`
    };
  }

  // Find non-icon purchased squad players
  const purchasedNonIconPlayers = allPlayers.filter(p => {
    if (!p) return false;
    const pTeamId = p.teamId || p.team_id;
    const isThisTeam = (pTeamId && (pTeamId === team.id || toUUID(pTeamId) === toUUID(team.id))) || (p.teamName && (p.teamName || '').trim().toLowerCase() === (team.name || '').trim().toLowerCase());
    if (!isThisTeam) return false;
    if (iconItem && ((iconPlayerObj && p.id === iconPlayerObj.id) || (iconRawName && p.name && p.name.trim().toLowerCase() === iconRawName.toLowerCase()))) {
      return false;
    }
    if (p.isIcon || p.isIconPlayer) return false;
    return (p.auctionStatus === 'SOLD' || p.isSold === true || !!pTeamId);
  });

  const totalPurse = Number(team.purseBudget || team.purse || 8000);
  const iconDeduction = iconItem ? defaultIconFee : 0;
  const auctionSpent = purchasedNonIconPlayers.reduce((sum, p) => sum + (Number(p.soldPrice) || Number(p.basePrice) || 300), 0);
  const totalSpent = iconDeduction + auctionSpent;
  const remainingPurse = Math.max(0, totalPurse - totalSpent);

  return {
    team,
    iconItem,
    purchasedNonIconPlayers,
    totalPurse,
    iconDeduction,
    auctionSpent,
    totalSpent,
    remainingPurse
  };
}

// HELPER: Format timestamp like 'Sun, 23 Aug, 2026, 09:27 pm'
function getFormattedPDFTimestamp() {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[now.getDay()];
  const day = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${dayName}, ${day} ${monthName}, ${year}, ${strHours}:${minutes} ${ampm}`;
}

// HELPER: Build single-page HTML for a team squad
function generateTeamSinglePageHtml(team, allPlayers, processedIconItem, processedPlayers, teamIdx = 0, totalTeamsCount = 8, formattedTimestamp = '', tournamentName = '') {
  const tourneyName = tournamentName || getTournamentDocName();
  const defaultIconFee = Number(store.getAuctionSettings().defaultIconPrice) || 1000;
  const targetSquadSize = Number(store.getAuctionSettings().maxSquadSize) || 13;
  const squadData = getTeamFinalSquadData(team, allPlayers);
  const { totalPurse, iconDeduction, auctionSpent, totalSpent, remainingPurse } = squadData;
  const iconItem = processedIconItem;
  const squadCount = (iconItem ? 1 : 0) + processedPlayers.length;

  let rowsHtml = '';
  let currentSl = 1;

  // Row 1: Icon Player (Highlight + ⭐)
  if (iconItem) {
    rowsHtml += `
      <tr style="background-color: #FEF3C7; border-left: 3.5px solid #F59E0B; height: 38px;">
        <td style="text-align: center; vertical-align: middle; padding: 2px;">
          <span style="background: #F59E0B; color: #FFFFFF; font-weight: 900; font-family: monospace; font-size: 10px; padding: 2px 5px; border-radius: 6px; letter-spacing: 0.5px;">#1 ⭐</span>
        </td>
        <td style="text-align: center; vertical-align: middle; padding: 2px; width: 44px;">
          <div style="width: 36px; height: 36px; background-color: #FFFFFF; border: 2px solid #F59E0B; border-radius: 7px; margin: 0 auto; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            ${iconItem.photoBase64 ? `<img src="${iconItem.photoBase64}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="font-size: 18px;">⭐</div>`}
          </div>
        </td>
        <td style="vertical-align: middle; padding: 2px 6px;">
          <div style="font-size: 13px; font-weight: 900; color: #78350F; display: flex; align-items: center; gap: 4px;">
            <span>⭐ ${iconItem.name}</span>
            <span style="background: #B45309; color: white; font-size: 8px; padding: 1px 4px; border-radius: 3px; font-weight: 900;">ICON</span>
          </div>
        </td>
        <td style="font-family: monospace; font-weight: 800; color: #0284C7; font-size: 11.5px; vertical-align: middle; padding: 2px 6px; white-space: nowrap;">
          📞 ${iconItem.phone || 'N/A'}
        </td>
        <td style="font-size: 11px; color: #334155; font-weight: 600; vertical-align: middle; padding: 2px 6px;">
          📍 ${iconItem.village || 'Paschim Medinipur'}
        </td>
        <td style="color: #0F172A; font-weight: 800; font-size: 11px; vertical-align: middle; padding: 2px 6px;">
          🏏 ${iconItem.category || 'Icon Player'}
        </td>
        <td style="text-align: right; font-weight: 900; color: #92400E; font-size: 12px; font-family: monospace; vertical-align: middle; padding: 2px 8px; white-space: nowrap;">
          ₹ ${defaultIconFee.toLocaleString('en-IN')}
        </td>
      </tr>
    `;
    currentSl++;
  }

  // Rows 2 to 13: Auctioned Squad Players
  processedPlayers.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    const playerSoldPrice = Number(p.soldPrice) || Number(p.basePrice) || 300;
    rowsHtml += `
      <tr style="background-color: ${isEven ? '#FFFFFF' : '#F8FAFC'}; height: 38px; border-bottom: 1px solid #E2E8F0;">
        <td style="text-align: center; vertical-align: middle; font-weight: bold; font-family: monospace; font-size: 11.5px; color: #475569; padding: 2px;">
          #${currentSl}
        </td>
        <td style="text-align: center; vertical-align: middle; padding: 2px; width: 44px;">
          <div style="width: 36px; height: 36px; background-color: #FFFFFF; border: 1.5px solid #0F172A; border-radius: 7px; margin: 0 auto; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            ${p.photoBase64 ? `<img src="${p.photoBase64}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="font-size: 16px;">🏏</div>`}
          </div>
        </td>
        <td style="vertical-align: middle; padding: 2px 6px;">
          <div style="font-size: 12.5px; font-weight: 800; color: #0F172A;">${p.name}</div>
          <div style="font-size: 9.5px; color: #64748B; font-weight: 600;">Reg No: <span style="font-family: monospace; font-weight: bold;">${p.displayRegistrationNumber || p.serialNo || p.registrationId || 'N/A'}</span></div>
        </td>
        <td style="font-family: monospace; font-weight: 800; color: #0284C7; font-size: 11.5px; vertical-align: middle; padding: 2px 6px; white-space: nowrap;">
          📞 ${p.phone || p.mobile || 'N/A'}
        </td>
        <td style="font-size: 11px; color: #334155; font-weight: 600; vertical-align: middle; padding: 2px 6px;">
          📍 ${p.village ? `${p.village}${p.district ? ', ' + p.district : ''}` : p.address || 'Paschim Medinipur'}
        </td>
        <td style="color: #0F172A; font-weight: 700; font-size: 11px; vertical-align: middle; padding: 2px 6px;">
          🏏 ${p.category || p.playingType || p.role || 'All Rounder'}
        </td>
        <td style="text-align: right; font-weight: 900; color: #059669; font-size: 12.5px; font-family: monospace; vertical-align: middle; padding: 2px 8px; white-space: nowrap;">
          ₹ ${playerSoldPrice.toLocaleString('en-IN')}
        </td>
      </tr>
    `;
    currentSl++;
  });

  // Remaining slots up to targetSquadSize if squad has less players
  while (currentSl <= targetSquadSize) {
    rowsHtml += `
      <tr style="background-color: #F8FAFC; height: 32px; border-bottom: 1px dashed #E2E8F0;">
        <td style="text-align: center; vertical-align: middle; font-weight: bold; font-family: monospace; font-size: 11px; color: #94A3B8; padding: 2px;">#${currentSl}</td>
        <td style="text-align: center; vertical-align: middle; padding: 2px; width: 44px;">
          <div style="width: 34px; height: 26px; border: 1px dashed #CBD5E1; border-radius: 5px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #94A3B8; font-size: 9px; font-weight: bold;">
            #${currentSl}
          </div>
        </td>
        <td style="vertical-align: middle; padding: 2px 6px; color: #94A3B8; font-style: italic; font-weight: 600; font-size: 11px;">[Reserve / Vacant Slot #${currentSl}]</td>
        <td style="text-align: center; color: #CBD5E1; font-size: 11px; vertical-align: middle;">—</td>
        <td style="text-align: center; color: #CBD5E1; font-size: 11px; vertical-align: middle;">—</td>
        <td style="text-align: center; color: #CBD5E1; font-size: 11px; vertical-align: middle;">—</td>
        <td style="text-align: right; color: #94A3B8; font-family: monospace; font-size: 11px; vertical-align: middle; padding: 2px 8px;">₹ 0</td>
      </tr>
    `;
    currentSl++;
  }

  return `
    <div class="team-page" style="${teamIdx > 0 ? 'page-break-before: always;' : ''}">
      <!-- 1. TOP HEADER -->
      <div class="header-box">
        <h1 class="tournament-name">${tourneyName}</h1>
        <div class="doc-subtitle">Official Final Auction Squad & Roster</div>
        <div class="doc-meta">📅 Generated: ${formattedTimestamp} • Team ${teamIdx + 1} of ${totalTeamsCount}</div>
      </div>

      <!-- 2. TEAM BAR (NO TEAM LOGO, CENTER TEAM NAME, RIGHT OWNER NAME) -->
      <div class="team-banner">
        <div class="team-tag">🛡️ SQUAD ROSTER</div>
        <div class="team-title-center">${team.name}</div>
        <div class="team-owner-right">
          👑 Owner: <strong>${team.ownerName || 'Partho Ghosh'}</strong>
          ${team.ownerPhone ? `<span style="font-size: 10px; color: #FEF08A; font-family: monospace;"> (📞 ${team.ownerPhone})</span>` : ''}
        </div>
      </div>

      <!-- 3. FINANCIAL SUMMARY BAR (COMPACT 5 STATS) -->
      <div class="finance-bar">
        <div class="fin-pill">
          <span class="fin-lbl">Purse Budget:</span>
          <span class="fin-num">₹ ${totalPurse.toLocaleString('en-IN')}</span>
        </div>
        <div class="fin-pill">
          <span class="fin-lbl">Icon Deduction:</span>
          <span class="fin-num" style="color: #D97706;">₹ ${iconDeduction.toLocaleString('en-IN')}</span>
        </div>
        <div class="fin-pill">
          <span class="fin-lbl">Auction Spend:</span>
          <span class="fin-num" style="color: #DC2626;">₹ ${auctionSpent.toLocaleString('en-IN')}</span>
        </div>
        <div class="fin-pill fin-balance">
          <span class="fin-lbl" style="color: #047857;">Purse Balance Left:</span>
          <span class="fin-num" style="color: #047857; font-size: 13px;">₹ ${remainingPurse.toLocaleString('en-IN')}</span>
        </div>
        <div class="fin-pill">
          <span class="fin-lbl">Squad Count:</span>
          <span class="fin-num" style="color: #0284C7;">${squadCount} / ${targetSquadSize} Players</span>
        </div>
      </div>

      <!-- 4. SQUAD MEMBERS TABLE -->
      <div class="table-container">
        <table class="squad-table">
          <thead>
            <tr>
              <th style="width: 38px; text-align: center;">SL</th>
              <th style="width: 44px; text-align: center;">PHOTO</th>
              <th>PLAYER NAME & REGISTRATION</th>
              <th style="width: 110px;">PHONE NUMBER</th>
              <th>ADDRESS / VILLAGE</th>
              <th style="width: 105px;">ROLE / CATEGORY</th>
              <th style="width: 85px; text-align: right;">SOLD PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 5. LOWER SIGNATURES & RECORD FOOTER -->
      <div class="lower-section">
        <div class="signatures-row">
          <div class="sig-col">
            <div class="sig-line"></div>
            <div class="sig-text">Owner Signature: <span style="font-weight: bold; color: #0F172A;">${team.ownerName || team.name}</span></div>
          </div>
          <div class="sig-col" style="text-align: right;">
            <div class="sig-line"></div>
            <div class="sig-text">${tourneyName} Organiser Signature</div>
          </div>
        </div>

        <div class="footer-credit">
          ${tourneyName} • Official Auction Roster Record • System Architect: Suman Kolay
        </div>
      </div>
    </div>
  `;
}

// GENERATE PROFESSIONAL PRINTABLE PDF FOR A SINGLE TEAM'S FINAL AUCTION SQUAD
export async function exportTeamFinalSquadToPDF(team, allPlayers) {
  if (!team) {
    alert("Invalid team selected for PDF export.");
    return;
  }

  // Handle ARJO XI name replacement if present
  if (team.name && (team.name.trim().toLowerCase() === 'arjo xi' || team.name.trim().toLowerCase() === 'arjo' || team.name.trim().toLowerCase() === 'arjo 11')) {
    team.name = 'SWEETY JEWELLERS';
    team.ownerName = 'Partho Ghosh';
    team.shortCode = 'SJ';
  }

  const teams = store.getTeams();
  let tIdx = teams.findIndex(t => t.id === team.id);
  if (tIdx === -1) tIdx = 0;

  // Show loading overlay
  const loadingOverlayHtml = `
    <div id="team-pdf-loading-overlay" class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center space-y-3 animate-fade-in border-2 border-amber-500/60 shadow-2xl">
      <div class="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="space-y-1">
        <span class="px-3 py-1 bg-amber-950 text-amber-300 text-[10px] font-black rounded-full border border-amber-800 uppercase tracking-widest">
          🏆 Final Squad PDF Generator
        </span>
        <h3 class="text-base sm:text-xl font-black text-white">Generating ${team.name} Squad PDF...</h3>
        <p class="text-xs text-slate-300 max-w-xs mx-auto">
          Syncing real player HD photos, Icon player badge, auction sold values & team balance.
        </p>
        <div id="team-pdf-fetch-progress" class="text-amber-400 font-mono text-xs font-black pt-2">
          Processing photos...
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', loadingOverlayHtml);

  try {
    const squadData = getTeamFinalSquadData(team, allPlayers);
    const { iconItem, purchasedNonIconPlayers } = squadData;

    // Convert Icon Photo to Lightweight Base64 (~4KB)
    if (iconItem) {
      const progressElem = document.getElementById('team-pdf-fetch-progress');
      if (progressElem) progressElem.innerText = `Compressing Icon photo: ${iconItem.name}...`;
      iconItem.photoBase64 = await convertImageToLightweightBase64(iconItem.photoUrl, 100, 0.70, 'assets/card_jsl_user.png');
    }

    // Convert Non-Icon Players Photos to Lightweight Base64 (~4KB)
    const processedPlayers = [];
    for (let i = 0; i < purchasedNonIconPlayers.length; i++) {
      const p = purchasedNonIconPlayers[i];
      const progressElem = document.getElementById('team-pdf-fetch-progress');
      if (progressElem) progressElem.innerText = `Compressing squad photo ${i + 1} of ${purchasedNonIconPlayers.length}: ${p.name}...`;
      const photoSrc = p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '';
      const photoBase64 = await convertImageToLightweightBase64(photoSrc, 100, 0.70, 'assets/card_jsl_user.png');
      processedPlayers.push({ ...p, photoBase64 });
    }

    document.getElementById('team-pdf-loading-overlay')?.remove();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups in your browser to view and print the PDF.");
      return;
    }

    const formattedTimestamp = getFormattedPDFTimestamp();
    const tourneyName = getTournamentDocName();
    const pageHtml = generateTeamSinglePageHtml(team, allPlayers, iconItem, processedPlayers, tIdx, teams.length || 8, formattedTimestamp, tourneyName);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tourneyName} - Final Auction Squad: ${team.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            padding: 10px 14px; 
            color: #0F172A; 
            background: #FFFFFF; 
          }
          
          /* ACTION TOOLBAR (Hidden during print) */
          .toolbar { display: flex; justify-content: space-between; align-items: center; background: #0F172A; color: white; padding: 10px 16px; border-radius: 12px; margin-bottom: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
          .toolbar-title { font-weight: 900; font-size: 13px; letter-spacing: 0.5px; }
          .toolbar-btn { background: #059669; color: white; border: none; padding: 7px 15px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
          .toolbar-btn:hover { background: #047857; }

          /* SINGLE-PAGE CONTAINER (Exact A4 Fit) */
          .team-page { 
            box-sizing: border-box; 
            height: 100vh; 
            max-height: 285mm; 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
            page-break-inside: avoid; 
            page-break-after: always; 
          }
          .team-page:last-child { page-break-after: auto; }

          /* 1. HEADER */
          .header-box { text-align: center; border-bottom: 2.5px solid #0F172A; padding-bottom: 6px; margin-bottom: 6px; }
          .tournament-name { font-size: 21px; font-weight: 900; color: #0B192C; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; }
          .doc-subtitle { font-size: 13px; font-weight: 800; color: #D97706; text-transform: uppercase; margin-top: 1px; letter-spacing: 0.5px; }
          .doc-meta { font-size: 10px; color: #475569; font-weight: 700; margin-top: 2px; }

          /* 2. TEAM BANNER (NO LOGO, CENTER TEAM NAME, RIGHT OWNER NAME) */
          .team-banner { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); 
            color: white; 
            border-radius: 10px; 
            padding: 6px 14px; 
            margin-bottom: 6px; 
            border: 1.5px solid #D97706; 
          }
          .team-tag { font-size: 9.5px; font-weight: 900; background: #D97706; color: #0F172A; padding: 2px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; shrink-0; }
          .team-title-center { font-size: 19px; font-weight: 900; color: #FFFFFF; text-align: center; flex: 1; letter-spacing: 0.5px; text-transform: uppercase; }
          .team-owner-right { font-size: 11.5px; font-weight: 800; color: #FDE047; text-align: right; shrink-0; }

          /* 3. FINANCIAL SUMMARY BAR */
          .finance-bar { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 6px; }
          .fin-pill { flex: 1; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 4px 6px; text-align: center; }
          .fin-lbl { display: block; font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748B; letter-spacing: 0.3px; }
          .fin-num { font-size: 11.5px; font-weight: 900; font-family: monospace; color: #0F172A; margin-top: 1px; }
          .fin-balance { background: #ECFDF5; border-color: #10B981; }

          /* 4. SQUAD TABLE */
          .table-container { flex: 1; margin-bottom: 6px; }
          table.squad-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
          table.squad-table th { background-color: #0F172A; color: white; font-weight: 900; text-align: left; text-transform: uppercase; font-size: 10px; padding: 5px 6px; border: 1px solid #0F172A; letter-spacing: 0.3px; }
          table.squad-table td { border: 1px solid #CBD5E1; padding: 2px 6px; vertical-align: middle; }

          /* 5. LOWER SIGNATURES & RECORD FOOTER */
          .lower-section { margin-top: 2px; }
          .signatures-row { display: flex; justify-content: space-between; padding: 4px 20px; }
          .sig-col { width: 230px; }
          .sig-line { border-bottom: 1.5px solid #0F172A; height: 26px; margin-bottom: 3px; }
          .sig-text { font-size: 10px; font-weight: 800; color: #0F172A; }
          .footer-credit { margin-top: 5px; text-align: center; font-size: 9.5px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 4px; font-weight: bold; }

          @media print {
            body { padding: 0; background: white; }
            .toolbar { display: none !important; }
            @page { size: A4 portrait; margin: 6mm 7mm 4mm 7mm; }
            .team-page { height: 100vh; max-height: 284mm; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="toolbar-title">🏆 ${tourneyName} Final Auction Squad Document — ${team.name}</div>
          <button class="toolbar-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        ${pageHtml}
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 400);
    };
  } catch (err) {
    document.getElementById('team-pdf-loading-overlay')?.remove();
    console.error("Team PDF Export Error:", err);
    alert("An error occurred while generating the Team PDF: " + err.message);
  }
}

// GENERATE PROFESSIONAL MULTI-PAGE PRINTABLE PDF FOR ALL REGISTERED TEAMS FINAL SQUADS
export async function exportAllTeamsFinalSquadsToPDF(teams, allPlayers) {
  if (!teams || teams.length === 0) {
    alert("No teams available for PDF export.");
    return;
  }

  // Auto-migrate ARJO XI team name if present
  teams.forEach(t => {
    if (t.name && (t.name.trim().toLowerCase() === 'arjo xi' || t.name.trim().toLowerCase() === 'arjo' || t.name.trim().toLowerCase() === 'arjo 11')) {
      t.name = 'SWEETY JEWELLERS';
      t.ownerName = 'Partho Ghosh';
      t.shortCode = 'SJ';
    }
  });

  const loadingOverlayHtml = `
    <div id="all-teams-pdf-loading-overlay" class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center space-y-3 animate-fade-in border-2 border-amber-500/60 shadow-2xl">
      <div class="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div class="space-y-1">
        <span class="px-3 py-1 bg-amber-950 text-amber-300 text-[10px] font-black rounded-full border border-amber-800 uppercase tracking-widest">
          🏆 Complete Tournament Squads PDF
        </span>
        <h3 class="text-base sm:text-xl font-black text-white">Generating All Teams (${teams.length}) Squad PDFs...</h3>
        <p class="text-xs text-slate-300 max-w-xs mx-auto">
          Compiling all 1-page franchise squads, HD photos, Icon badges & team purse balances into a master document.
        </p>
        <div id="all-teams-pdf-progress" class="text-amber-400 font-mono text-xs font-black pt-2">
          Starting document compilation...
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', loadingOverlayHtml);

  try {
    const pagesHtmlList = [];
    const formattedTimestamp = getFormattedPDFTimestamp();
    const tourneyName = getTournamentDocName();
    const totalTeams = teams.length;

    for (let tIdx = 0; tIdx < totalTeams; tIdx++) {
      const team = teams[tIdx];
      const progressElem = document.getElementById('all-teams-pdf-progress');
      if (progressElem) progressElem.innerText = `Processing Team ${tIdx + 1} of ${totalTeams}: ${team.name}...`;

      const squadData = getTeamFinalSquadData(team, allPlayers);
      const { iconItem, purchasedNonIconPlayers } = squadData;

      if (iconItem) {
        iconItem.photoBase64 = await convertImageToLightweightBase64(iconItem.photoUrl, 100, 0.70, 'assets/card_jsl_user.png');
      }

      const processedPlayers = [];
      for (let i = 0; i < purchasedNonIconPlayers.length; i++) {
        const p = purchasedNonIconPlayers[i];
        const photoSrc = p.hdPhotoUrl || p.photoUrl || p.player_photo_url || '';
        const photoBase64 = await convertImageToLightweightBase64(photoSrc, 100, 0.70, 'assets/card_jsl_user.png');
        processedPlayers.push({ ...p, photoBase64 });
      }

      const pageHtml = generateTeamSinglePageHtml(team, allPlayers, iconItem, processedPlayers, tIdx, totalTeams, formattedTimestamp, tourneyName);
      pagesHtmlList.push(pageHtml);
    }

    document.getElementById('all-teams-pdf-loading-overlay')?.remove();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups in your browser to view and print the PDF.");
      return;
    }

    const masterHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tourneyName} - All Teams Final Auction Squads PDF</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            padding: 10px 14px; 
            color: #0F172A; 
            background: #FFFFFF; 
          }
          
          .toolbar { display: flex; justify-content: space-between; align-items: center; background: #0F172A; color: white; padding: 10px 16px; border-radius: 12px; margin-bottom: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
          .toolbar-title { font-weight: 900; font-size: 13px; letter-spacing: 0.5px; }
          .toolbar-btn { background: #059669; color: white; border: none; padding: 7px 15px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
          .toolbar-btn:hover { background: #047857; }

          .team-page { 
            box-sizing: border-box; 
            height: 100vh; 
            max-height: 285mm; 
            display: flex; 
            flex-direction: column; 
            justify-content: space-between; 
            page-break-inside: avoid; 
            page-break-after: always; 
          }
          .team-page:last-child { page-break-after: auto; }

          .header-box { text-align: center; border-bottom: 2.5px solid #0F172A; padding-bottom: 6px; margin-bottom: 6px; }
          .tournament-name { font-size: 21px; font-weight: 900; color: #0B192C; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; }
          .doc-subtitle { font-size: 13px; font-weight: 800; color: #D97706; text-transform: uppercase; margin-top: 1px; letter-spacing: 0.5px; }
          .doc-meta { font-size: 10px; color: #475569; font-weight: 700; margin-top: 2px; }

          .team-banner { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); 
            color: white; 
            border-radius: 10px; 
            padding: 6px 14px; 
            margin-bottom: 6px; 
            border: 1.5px solid #D97706; 
          }
          .team-tag { font-size: 9.5px; font-weight: 900; background: #D97706; color: #0F172A; padding: 2px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; shrink-0; }
          .team-title-center { font-size: 19px; font-weight: 900; color: #FFFFFF; text-align: center; flex: 1; letter-spacing: 0.5px; text-transform: uppercase; }
          .team-owner-right { font-size: 11.5px; font-weight: 800; color: #FDE047; text-align: right; shrink-0; }

          .finance-bar { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 6px; }
          .fin-pill { flex: 1; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 4px 6px; text-align: center; }
          .fin-lbl { display: block; font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748B; letter-spacing: 0.3px; }
          .fin-num { font-size: 11.5px; font-weight: 900; font-family: monospace; color: #0F172A; margin-top: 1px; }
          .fin-balance { background: #ECFDF5; border-color: #10B981; }

          .table-container { flex: 1; margin-bottom: 6px; }
          table.squad-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
          table.squad-table th { background-color: #0F172A; color: white; font-weight: 900; text-align: left; text-transform: uppercase; font-size: 10px; padding: 5px 6px; border: 1px solid #0F172A; letter-spacing: 0.3px; }
          table.squad-table td { border: 1px solid #CBD5E1; padding: 2px 6px; vertical-align: middle; }

          .lower-section { margin-top: 2px; }
          .signatures-row { display: flex; justify-content: space-between; padding: 4px 20px; }
          .sig-col { width: 230px; }
          .sig-line { border-bottom: 1.5px solid #0F172A; height: 26px; margin-bottom: 3px; }
          .sig-text { font-size: 10px; font-weight: 800; color: #0F172A; }
          .footer-credit { margin-top: 5px; text-align: center; font-size: 9.5px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 4px; font-weight: bold; }

          @media print {
            body { padding: 0; background: white; }
            .toolbar { display: none !important; }
            @page { size: A4 portrait; margin: 6mm 7mm 4mm 7mm; }
            .team-page { height: 100vh; max-height: 284mm; page-break-after: always; }
            .team-page:last-child { page-break-after: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="toolbar-title">🏆 ${tourneyName} Complete Tournament Final Squads (${totalTeams} Teams)</div>
          <button class="toolbar-btn" onclick="window.print()">🖨️ Print / Save Complete PDF</button>
        </div>

        ${pagesHtmlList.join('')}
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(masterHtml);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  } catch (err) {
    document.getElementById('all-teams-pdf-loading-overlay')?.remove();
    console.error("All Teams PDF Export Error:", err);
    alert("An error occurred while generating All Teams PDF: " + err.message);
  }
}

// ==============================================================================
// 🏏 OFFICIAL PRINTABLE MATCH SCORECARD PDF (A4 PORTRAIT)
// ==============================================================================
export function exportMatchScorecardPDF(fixture, tourney) {
  if (!fixture) {
    alert("Match fixture data not found.");
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups in your browser to view and print the Official Match Scorecard.");
    return;
  }

  const tourneyName = (tourney?.name || fixture.leagueCode || 'Cricket Premier League').toUpperCase();
  const venue = fixture.venue || tourney?.venue || 'JHANKRA HIGH SCHOOL GROUND';
  const matchNo = fixture.matchNo || 1;
  const stage = (fixture.stage || fixture.groupCode || 'LEAGUE MATCH').replace(/_/g, ' ').toUpperCase();
  const date = fixture.date || new Date().toISOString().slice(0, 10);
  const time = fixture.time || '09:00 AM';
  const teamA = fixture.teamAName || 'Team A';
  const teamB = fixture.teamBName || 'Team B';
  const toss = fixture.tossDetails || `${teamA} won the toss & elected to bat`;
  const result = fixture.result || fixture.resultText || (fixture.winnerTeamName ? `${fixture.winnerTeamName} WON` : 'MATCH COMPLETED');
  const potm = fixture.potmName || fixture.playerOfTheMatch || fixture.mvpName || '—';

  // Innings 1 data
  const inn1Score = fixture.teamAScore || { runs: 0, wickets: 0, overs: 0, balls: 0 };
  const inn1Batters = fixture.teamABatting || fixture.innings1Batting || [
    { name: 'Opening Batter 1', dismissal: 'c & b Bowler', runs: 34, balls: 22, fours: 4, sixes: 1, sr: 154.5 },
    { name: 'Opening Batter 2', dismissal: 'b Bowler', runs: 45, balls: 30, fours: 6, sixes: 2, sr: 150.0 },
    { name: 'Top Order Batter 3', dismissal: 'not out', runs: 28, balls: 18, fours: 3, sixes: 1, sr: 155.5 },
    { name: 'Middle Order Batter 4', dismissal: 'run out', runs: 12, balls: 8, fours: 1, sixes: 0, sr: 150.0 }
  ];
  const inn1Bowlers = fixture.teamBBowling || fixture.innings1Bowling || [
    { name: 'Opening Bowler 1', overs: '4.0', maidens: 0, runs: 28, wickets: 2, econ: 7.00, dots: 10 },
    { name: 'Opening Bowler 2', overs: '4.0', maidens: 1, runs: 22, wickets: 1, econ: 5.50, dots: 14 },
    { name: 'Spinner 3', overs: '4.0', maidens: 0, runs: 35, wickets: 0, econ: 8.75, dots: 8 }
  ];

  // Innings 2 data
  const inn2Score = fixture.teamBScore || { runs: 0, wickets: 0, overs: 0, balls: 0 };
  const inn2Batters = fixture.teamBBatting || fixture.innings2Batting || [
    { name: 'Chasing Batter 1', dismissal: 'b Bowler', runs: 25, balls: 18, fours: 3, sixes: 1, sr: 138.8 },
    { name: 'Chasing Batter 2', dismissal: 'lbw b Bowler', runs: 18, balls: 14, fours: 2, sixes: 0, sr: 128.5 },
    { name: 'Captain Batter 3', dismissal: 'c Fielder b Bowler', runs: 38, balls: 26, fours: 4, sixes: 2, sr: 146.1 }
  ];
  const inn2Bowlers = fixture.teamABowling || fixture.innings2Bowling || [
    { name: 'Strike Bowler 1', overs: '4.0', maidens: 0, runs: 24, wickets: 3, econ: 6.00, dots: 12 },
    { name: 'Seamer 2', overs: '4.0', maidens: 0, runs: 30, wickets: 2, econ: 7.50, dots: 9 }
  ];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Official Scorecard - Match #${matchNo} (${teamA} vs ${teamB})</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        body { background-color: #F8FAFC; color: #0F172A; padding: 15px; }
        .toolbar { max-width: 900px; margin: 0 auto 15px auto; display: flex; justify-content: space-between; align-items: center; background: #0F172A; color: white; padding: 12px 20px; border-radius: 12px; }
        .toolbar-btn { background: #10B981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .scorecard-container { max-width: 900px; margin: 0 auto; background: white; border: 2px solid #0F172A; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header-box { text-align: center; border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 15px; }
        .tourney-title { font-size: 20px; font-weight: 900; color: #0F172A; letter-spacing: 0.5px; }
        .match-subtitle { font-size: 13px; font-weight: 800; color: #047857; margin-top: 2px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #F1F5F9; padding: 8px 12px; border-radius: 8px; font-size: 11px; margin-top: 8px; }
        .meta-item strong { color: #475569; display: block; font-size: 9.5px; text-transform: uppercase; }
        
        .result-banner { background: #ECFDF5; border: 1.5px solid #10B981; color: #064E3B; font-weight: 900; font-size: 13px; text-align: center; padding: 8px; border-radius: 8px; margin: 12px 0; }
        
        .innings-section { margin-bottom: 16px; }
        .innings-header { background: #0F172A; color: white; padding: 6px 12px; font-size: 12px; font-weight: 800; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; }
        
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
        th { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 5px 8px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; }
        td { border: 1px solid #E2E8F0; padding: 5px 8px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .font-bold { font-weight: bold; }
        
        .extras-row { background: #F8FAFC; font-size: 11px; padding: 6px 10px; border: 1px solid #E2E8F0; border-top: none; display: flex; justify-content: space-between; font-weight: bold; }
        .potm-box { background: #FFFBEB; border: 1.5px solid #F59E0B; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; margin-top: 10px; display: flex; justify-content: space-between; }

        .signatures-row { display: flex; justify-content: space-between; margin-top: 20px; padding: 10px 20px 0 20px; border-top: 1px solid #E2E8F0; }
        .sig-box { width: 180px; text-align: center; font-size: 10px; font-weight: bold; color: #64748B; }
        .sig-line { border-bottom: 1px solid #0F172A; height: 30px; margin-bottom: 4px; }

        @media print {
          body { padding: 0; background: white; }
          .toolbar { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
          .scorecard-container { border: 1px solid #000; box-shadow: none; padding: 12px; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div>🏏 <strong>Official Match Scorecard</strong> • Match #${matchNo} (${teamA} vs ${teamB})</div>
        <button class="toolbar-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>

      <div class="scorecard-container">
        <div class="header-box">
          <div class="tourney-title">🏆 ${tourneyName}</div>
          <div class="match-subtitle">OFFICIAL MATCH SCORECARD & SUMMARY • MATCH #${matchNo} (${stage})</div>
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Date</strong> ${date}</div>
            <div class="meta-item"><strong>Time</strong> ${time}</div>
            <div class="meta-item"><strong>Venue</strong> ${venue}</div>
            <div class="meta-item"><strong>Toss</strong> ${toss}</div>
          </div>
        </div>

        <div class="result-banner">
          🏆 RESULT: ${result}
        </div>

        <!-- 1ST INNINGS -->
        <div class="innings-section">
          <div class="innings-header">
            <span>1ST INNINGS: ${teamA.toUpperCase()}</span>
            <span>${inn1Score.runs || 0}/${inn1Score.wickets || 0} (${inn1Score.overs || 0}.${inn1Score.balls || 0} OVERS)</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Batter</th>
                <th style="text-align:left;">Dismissal</th>
                <th class="text-right">R</th>
                <th class="text-right">B</th>
                <th class="text-right">4s</th>
                <th class="text-right">6s</th>
                <th class="text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              ${inn1Batters.map(b => `
                <tr>
                  <td class="font-bold">${b.name}</td>
                  <td style="color:#64748B;">${b.dismissal || 'not out'}</td>
                  <td class="text-right font-bold font-mono">${b.runs || 0}</td>
                  <td class="text-right font-mono">${b.balls || 0}</td>
                  <td class="text-right font-mono">${b.fours || 0}</td>
                  <td class="text-right font-mono">${b.sixes || 0}</td>
                  <td class="text-right font-mono">${Number(b.sr || (b.balls ? (b.runs/b.balls*100) : 0)).toFixed(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="innings-header" style="background:#334155; font-size:11px; margin-top:6px;">
            <span>BOWLING ANALYSIS: ${teamB.toUpperCase()}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Bowler</th>
                <th class="text-right">O</th>
                <th class="text-right">M</th>
                <th class="text-right">R</th>
                <th class="text-right">W</th>
                <th class="text-right">Econ</th>
                <th class="text-right">Dots</th>
              </tr>
            </thead>
            <tbody>
              ${inn1Bowlers.map(bw => `
                <tr>
                  <td class="font-bold">${bw.name}</td>
                  <td class="text-right font-mono">${bw.overs || '4.0'}</td>
                  <td class="text-right font-mono">${bw.maidens || 0}</td>
                  <td class="text-right font-bold font-mono">${bw.runs || 0}</td>
                  <td class="text-right font-bold font-mono" style="color:#047857;">${bw.wickets || 0}</td>
                  <td class="text-right font-mono">${Number(bw.econ || 0).toFixed(2)}</td>
                  <td class="text-right font-mono">${bw.dots || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 2ND INNINGS -->
        <div class="innings-section">
          <div class="innings-header">
            <span>2ND INNINGS: ${teamB.toUpperCase()}</span>
            <span>${inn2Score.runs || 0}/${inn2Score.wickets || 0} (${inn2Score.overs || 0}.${inn2Score.balls || 0} OVERS)</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Batter</th>
                <th style="text-align:left;">Dismissal</th>
                <th class="text-right">R</th>
                <th class="text-right">B</th>
                <th class="text-right">4s</th>
                <th class="text-right">6s</th>
                <th class="text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              ${inn2Batters.map(b => `
                <tr>
                  <td class="font-bold">${b.name}</td>
                  <td style="color:#64748B;">${b.dismissal || 'not out'}</td>
                  <td class="text-right font-bold font-mono">${b.runs || 0}</td>
                  <td class="text-right font-mono">${b.balls || 0}</td>
                  <td class="text-right font-mono">${b.fours || 0}</td>
                  <td class="text-right font-mono">${b.sixes || 0}</td>
                  <td class="text-right font-mono">${Number(b.sr || (b.balls ? (b.runs/b.balls*100) : 0)).toFixed(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="innings-header" style="background:#334155; font-size:11px; margin-top:6px;">
            <span>BOWLING ANALYSIS: ${teamA.toUpperCase()}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Bowler</th>
                <th class="text-right">O</th>
                <th class="text-right">M</th>
                <th class="text-right">R</th>
                <th class="text-right">W</th>
                <th class="text-right">Econ</th>
                <th class="text-right">Dots</th>
              </tr>
            </thead>
            <tbody>
              ${inn2Bowlers.map(bw => `
                <tr>
                  <td class="font-bold">${bw.name}</td>
                  <td class="text-right font-mono">${bw.overs || '4.0'}</td>
                  <td class="text-right font-mono">${bw.maidens || 0}</td>
                  <td class="text-right font-bold font-mono">${bw.runs || 0}</td>
                  <td class="text-right font-bold font-mono" style="color:#047857;">${bw.wickets || 0}</td>
                  <td class="text-right font-mono">${Number(bw.econ || 0).toFixed(2)}</td>
                  <td class="text-right font-mono">${bw.dots || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="potm-box">
          <span>🏅 PLAYER OF THE MATCH (MVP)</span>
          <span>${potm}</span>
        </div>

        <div class="signatures-row">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>ON-FIELD UMPIRE 1</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>ON-FIELD UMPIRE 2</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>OFFICIAL SCORER</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
}
// ==============================================================================
// 🔨 OFFICIAL AUCTION ROSTER & SUMMARY PDF (A4 PORTRAIT)
// ==============================================================================
export function exportAuctionSummaryPDF(tourney, teams = [], players = []) {
  if (!teams || teams.length === 0) {
    alert("No teams available to export.");
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups in your browser to view and print the Auction Roster.");
    return;
  }

  const tourneyName = (tourney?.name || 'Cricket Premier League').toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${tourneyName} - Official Auction Summary & Team Rosters</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        body { background-color: #F8FAFC; color: #0F172A; padding: 15px; }
        .toolbar { max-width: 900px; margin: 0 auto 15px auto; display: flex; justify-content: space-between; align-items: center; background: #0F172A; color: white; padding: 12px 20px; border-radius: 12px; }
        .toolbar-btn { background: #D97706; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .page { max-width: 900px; margin: 0 auto 20px auto; background: white; border: 2px solid #0F172A; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header { text-align: center; border-bottom: 2px solid #0F172A; padding-bottom: 10px; margin-bottom: 15px; }
        .title { font-size: 20px; font-weight: 900; }
        .subtitle { font-size: 12px; font-weight: 800; color: #B45309; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
        th { background: #0F172A; color: white; padding: 6px 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        td { border: 1px solid #E2E8F0; padding: 5px 8px; }
        .team-box { border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 10px; margin-bottom: 14px; background: #F8FAFC; }
        .team-header { display: flex; justify-content: space-between; font-weight: 900; font-size: 13px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 8px; }
        .purse-pill { font-size: 11px; font-family: monospace; color: #047857; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
        @media print {
          body { padding: 0; background: white; }
          .toolbar { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
          .page { border: 1px solid #000; box-shadow: none; page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          .team-box { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div>🔨 <strong>${tourneyName}</strong> • Official Auction Summary Report</div>
        <button class="toolbar-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>

      <div class="page">
        <div class="header">
          <div class="title">🏆 ${tourneyName}</div>
          <div class="subtitle">OFFICIAL PLAYER AUCTION SUMMARY & TEAM ROSTERS • ${dateStr}</div>
        </div>

        <h3 style="font-size: 13px; font-weight: 900; margin-bottom: 8px; color: #0F172A;">📊 FRANCHISE TEAM PURSE EXPENDITURE</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:center; width:35px;">#</th>
              <th style="text-align:left;">Team Name</th>
              <th style="text-align:left;">Owner</th>
              <th class="text-right">Total Purse</th>
              <th class="text-right">Spent</th>
              <th class="text-right">Remaining</th>
              <th class="text-right">Squad Size</th>
            </tr>
          </thead>
          <tbody>
            ${teams.map((t, i) => {
              const squad = players.filter(p => p.teamId === t.id);
              const spent = squad.reduce((sum, p) => sum + Number(p.soldPrice || p.boughtPrice || 0), 0);
              const purse = Number(t.purseBudget || t.purse || tourney?.teamPurse || 8000);
              const rem = Math.max(0, purse - spent);
              return `
                <tr>
                  <td style="text-align:center; font-weight:bold;">${i + 1}</td>
                  <td class="font-bold">${t.name}</td>
                  <td>${t.ownerName || '—'}</td>
                  <td class="text-right font-mono">₹ ${purse.toLocaleString('en-IN')}</td>
                  <td class="text-right font-mono font-bold" style="color:#B45309;">₹ ${spent.toLocaleString('en-IN')}</td>
                  <td class="text-right font-mono font-bold" style="color:#047857;">₹ ${rem.toLocaleString('en-IN')}</td>
                  <td class="text-right font-bold">${squad.length}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h3 style="font-size: 13px; font-weight: 900; margin: 16px 0 8px 0; color: #0F172A;">🛡️ DETAILED TEAM SQUAD ROSTERS</h3>
        ${teams.map((t, idx) => {
          const squad = players.filter(p => p.teamId === t.id);
          const spent = squad.reduce((sum, p) => sum + Number(p.soldPrice || p.boughtPrice || 0), 0);
          return `
            <div class="team-box">
              <div class="team-header">
                <span>#${idx + 1} ${t.name.toUpperCase()} (${squad.length} Players)</span>
                <span class="purse-pill">Total Spent: ₹ ${spent.toLocaleString('en-IN')}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width:30px; text-align:center;">#</th>
                    <th style="text-align:left;">Player Name</th>
                    <th style="text-align:left;">Category / Role</th>
                    <th style="text-align:left;">Location</th>
                    <th class="text-right">Auction Bid Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${squad.map((p, pIdx) => `
                    <tr>
                      <td style="text-align:center; font-weight:bold;">${pIdx + 1}</td>
                      <td class="font-bold">${p.name} ${p.isIcon ? '<span style="color:#D97706;">(ICON)</span>' : ''}</td>
                      <td>${p.category || p.role || 'All-rounder'}</td>
                      <td>${p.village || p.address || 'Local'}</td>
                      <td class="text-right font-mono font-bold" style="color:#047857;">₹ ${Number(p.soldPrice || p.boughtPrice || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
}

// ==============================================================================
// 🎨 OFFICIAL PLAYER SOCIAL MEDIA STORY CARD (CANVAS 1080x1350)
// ==============================================================================
export function exportPlayerSocialCard(player, team, tourney) {
  if (!player) return;

  document.getElementById('player-social-card-modal')?.remove();

  const tourneyName = (tourney?.name || 'Cricket Premier League').toUpperCase();
  const teamName = (team?.name || 'Franchise Team').toUpperCase();
  const serialNo = player.displayRegistrationNumber || player.serialNo || 1;
  const photoSrc = player.photoUrl || player.player_photo_url || 'assets/card_jsl_user.png';
  const runs = player.totalRuns || player.runs || 0;
  const wickets = player.totalWickets || player.wickets || 0;
  const strikeRate = player.strikeRate || player.sr || '135.4';
  const sixes = player.totalSixes || player.sixes || 0;
  const role = player.category || player.playingType || 'All-rounder';
  const village = player.village || player.address || 'Local';

  const modalHtml = `
    <div id="player-social-card-modal" class="fixed inset-0 z-[90] modal-overlay flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div class="bg-gradient-to-br from-[#0B1120] via-[#111827] to-[#064E3B] text-white max-w-sm w-full p-4 rounded-3xl border-2 border-emerald-400 shadow-2xl space-y-3 relative overflow-hidden flex flex-col items-center max-h-[92vh]">
        
        <!-- Header -->
        <div class="w-full flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-base">🎨</span>
            <span class="text-xs font-black uppercase text-emerald-300 tracking-wider">Social Story Card</span>
          </div>
          <button id="close-social-card-btn" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs font-black cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Canvas Preview -->
        <div class="w-full rounded-2xl overflow-hidden shadow-2xl border border-emerald-500/40 bg-slate-950 flex items-center justify-center relative aspect-[4/5] max-h-[58vh]">
          <canvas id="player-social-canvas" width="1080" height="1350" class="w-full h-full object-contain"></canvas>
          <div id="social-canvas-loading" class="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-emerald-400 text-xs font-black">
            <span class="inline-block w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
            <span>Rendering High-Res Story Card...</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="w-full flex gap-2 pt-1">
          <button id="btn-download-social-png" class="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all">
            <span>⬇️</span> <span>Download PNG Image</span>
          </button>
          <button id="btn-share-social-wa" class="px-3.5 py-2.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 font-bold text-xs rounded-xl border border-emerald-600/50 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all">
            <span>💬</span> <span>WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('close-social-card-btn')?.addEventListener('click', () => {
    document.getElementById('player-social-card-modal')?.remove();
  });

  const canvas = document.getElementById('player-social-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Draw High-Res Canvas Card (1080x1350)
  const drawCard = (img) => {
    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.4, '#0B1536');
    bgGrad.addColorStop(0.8, '#064E3B');
    bgGrad.addColorStop(1, '#022C22');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // 2. Ambient Lighting Circles
    const radial = ctx.createRadialGradient(540, 480, 50, 540, 480, 450);
    radial.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    radial.addColorStop(0.7, 'rgba(59, 130, 246, 0.15)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1080, 1350);

    // 3. Top Decorative Border & Header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(40, 40, 1000, 1270, 40);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tournament Name Header
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 ${tourneyName}`, 540, 110);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '800 24px sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('OFFICIAL PLAYER PROFILE CARD', 540, 150);

    // 4. Player Photo Frame
    const photoX = 540;
    const photoY = 430;
    const photoRadius = 220;

    // Glowing Ring
    ctx.save();
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(photoX, photoY, photoRadius + 12, 0, Math.PI * 2);
    ctx.fillStyle = '#10B981';
    ctx.fill();
    ctx.restore();

    // Clip & Draw Photo
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX, photoY, photoRadius, 0, Math.PI * 2);
    ctx.clip();
    if (img && img.complete) {
      ctx.drawImage(img, photoX - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
    } else {
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(photoX - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 120px sans-serif';
      ctx.fillText('🏏', photoX, photoY + 40);
    }
    ctx.restore();

    // Serial No Badge
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(photoX - 80, photoY + photoRadius - 25, 160, 50, 25);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${serialNo}`, photoX, photoY + photoRadius + 10);

    // 5. Player Name & Subtitles
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(player.name.toUpperCase(), 540, 750);
    ctx.shadowBlur = 0;

    // Team & Role Badge
    ctx.fillStyle = '#34D399';
    ctx.font = '800 30px sans-serif';
    ctx.fillText(`🛡️ ${teamName}  •  🏏 ${role.toUpperCase()}`, 540, 805);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 24px sans-serif';
    ctx.fillText(`📍 ${village.toUpperCase()} • PASCHIM MEDINIPUR`, 540, 845);

    // 6. 4 Statistics Boxes (2x2 Grid)
    const stats = [
      { label: 'TOTAL RUNS', val: String(runs), color: '#38BDF8' },
      { label: 'TOTAL WICKETS', val: String(wickets), color: '#34D399' },
      { label: 'STRIKE RATE', val: String(strikeRate), color: '#FBBF24' },
      { label: 'MAX SIXES (6s)', val: String(sixes), color: '#F43F5E' }
    ];

    const boxW = 450;
    const boxH = 130;
    const startX = 80;
    const startY = 890;

    stats.forEach((st, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (boxW + 20);
      const y = startY + row * (boxH + 18);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '800 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.label, x + boxW / 2, y + 42);

      ctx.fillStyle = st.color;
      ctx.font = '900 48px monospace';
      ctx.fillText(st.val, x + boxW / 2, y + 100);
    });

    // 7. Footer Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRICKET PREMIER LEAGUE 2026 • OFFICIAL PLAYER CARD', 540, 1260);

    document.getElementById('social-canvas-loading')?.classList.add('hidden');
  };

  const pImg = new Image();
  pImg.crossOrigin = 'anonymous';
  pImg.onload = () => drawCard(pImg);
  pImg.onerror = () => drawCard(null);
  pImg.src = photoSrc;

  // Download PNG listener
  document.getElementById('btn-download-social-png')?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `${player.name.replace(/\s+/g, '_')}_social_card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // WhatsApp share link
  document.getElementById('btn-share-social-wa')?.addEventListener('click', () => {
    const text = `🏏 *${player.name.toUpperCase()}* - Official Player Card\n🏆 ${tourneyName}\n🛡️ Team: ${teamName}\n📊 Runs: ${runs} | Wickets: ${wickets} | 6s: ${sixes}\n🔗 View Profile: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  });
}

if (typeof window !== 'undefined') {
  window.exportMatchScorecardPDF = exportMatchScorecardPDF;
  window.exportAuctionSummaryPDF = exportAuctionSummaryPDF;
  window.exportPlayerSocialCard = exportPlayerSocialCard;
}


