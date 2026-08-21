// Export & Printing Utility Module for PDF & CSV (Developer: Suman Kolay - User Guide PDF Release)

export function exportPlayersToCSV(players) {
  if (!players || players.length === 0) {
    alert('No player data available to export.');
    return;
  }

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
  link.setAttribute('download', `JSL_Registered_Players_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportTeamsToCSV(teams) {
  if (!teams || teams.length === 0) {
    alert('No team data available to export.');
    return;
  }

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
  link.setAttribute('download', `JSL_Registered_Teams_${new Date().toISOString().slice(0, 10)}.csv`);
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

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JSL 2026 - Registered Teams Directory PDF</title>
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
        <h1 class="title">JHANKRA SUPER LEAGUE (JSL 2026)</h1>
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
        Jhankra Super League (JSL 2026) • Official Registration Management System • Developer: Suman Kolay
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
        <title>JSL 2026 - Registered Players Directory (${filterLabel})</title>
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
          <h1 class="title">JHANKRA SUPER LEAGUE (JSL 2026)</h1>
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
          Jhankra Super League (JSL 2026) • Official Registration Management System • Developer: Suman Kolay
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

  const rawDate = player.registeredAt || player.createdAt || player.timestamp || player.date;
  const regDateTime = rawDate 
    ? new Date(rawDate).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JSL 2026 Player Pass - ${player.name} (${serialNo})</title>
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
        .official-seal { padding: 3px 8px; background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; border-radius: 8px; font-weight: 900; }

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
          <div class="league-title">JHANKRA SUPER LEAGUE</div>
          <div class="league-sub">JSL 2026 • OFFICIAL DIGITAL PLAYER PASS</div>
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
            <div class="player-team">🏆 ${team ? team.name : 'JSL Registered Player'}</div>
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
          <div class="official-seal">
            ✅ VERIFIED PASS
          </div>
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
