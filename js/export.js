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
export async function exportPlayersToPDF(players) {
  if (!players || players.length === 0) {
    alert('No players found to export.');
    return;
  }

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
          Building full printable PDF directory with Sl No, 120x120 HD Player Picture, Name, Phone Number, Age, Category, Address, and Status.
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
        <title>JSL 2026 - Registered Players Directory PDF</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1E293B; }
          .header-box { text-align: center; border-bottom: 3px solid #0F172A; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 26px; font-weight: 900; color: #0B192C; margin: 0; }
          .subtitle { font-size: 15px; font-weight: bold; color: #D97706; margin-top: 4px; }
          .meta { font-size: 11px; color: #64748B; margin-top: 6px; }
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
          <div class="subtitle">Official Registered Players Directory</div>
          <div class="meta">Generated: ${new Date().toLocaleString()} • Total Registered Players: ${players.length}</div>
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

// PRINT DIGITAL PASS FOR INDIVIDUAL PLAYER
export function printDigitalPass(player, league, team) {
  if (!player) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download your pass.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JSL 2026 Digital Player Pass - ${player.name}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0F172A; color: white; display: flex; justify-content: center; items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .pass-card { width: 340px; background: linear-gradient(135deg, #0B192C 0%, #1E3A8A 100%); border: 3px solid #F59E0B; border-radius: 20px; padding: 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); position: relative; }
        .league-title { font-size: 20px; font-weight: 900; color: #F59E0B; margin: 0; letter-spacing: 1px; }
        .league-sub { font-size: 11px; font-weight: bold; color: #38BDF8; margin-top: 4px; text-transform: uppercase; }
        .photo-frame { width: 130px; height: 130px; margin: 16px auto; border-radius: 18px; border: 3px solid #F59E0B; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.4); background: #FFFFFF; }
        .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .player-name { font-size: 22px; font-weight: 900; color: #FFFFFF; margin: 8px 0 2px 0; }
        .player-reg { display: inline-block; padding: 4px 12px; background: #000000; color: #F59E0B; font-family: monospace; font-weight: 900; font-size: 13px; border-radius: 8px; border: 1px solid #F59E0B; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; text-align: left; background: rgba(15, 23, 42, 0.8); padding: 12px; border-radius: 12px; border: 1px solid #334155; }
        .detail-item { font-size: 10px; color: #94A3B8; font-weight: bold; text-transform: uppercase; }
        .detail-val { font-size: 12px; color: #FFFFFF; font-weight: 900; margin-top: 2px; }
        .footer-note { margin-top: 16px; font-size: 9px; color: #94A3B8; border-top: 1px solid #334155; padding-top: 10px; font-weight: bold; }
        @media print {
          body { background: white; padding: 0; }
          .pass-card { box-shadow: none; border-color: #000; background: #0B192C !important; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="pass-card">
        <div class="league-title">JHANKRA SUPER LEAGUE</div>
        <div class="league-sub">JSL 2026 • OFFICIAL PLAYER PASS</div>

        <div class="photo-frame">
          ${player.photoUrl || player.player_photo_url ? `<img src="${player.photoUrl || player.player_photo_url}" />` : ''}
        </div>

        <div class="player-reg">${player.registrationId || player.regNo || 'JSL2026-0001'}</div>
        <div class="player-name">${player.name}</div>

        <div class="details-grid">
          <div>
            <div class="detail-item">Father Name</div>
            <div class="detail-val">${player.fatherName || 'N/A'}</div>
          </div>
          <div>
            <div class="detail-item">Category</div>
            <div class="detail-val" style="color: #38BDF8;">${player.category || player.playingType || 'All Rounder'}</div>
          </div>
          <div>
            <div class="detail-item">Age</div>
            <div class="detail-val" style="color: #F59E0B;">${player.age || 24} Yrs</div>
          </div>
          <div>
            <div class="detail-item">Phone</div>
            <div class="detail-val">${player.phone || 'N/A'}</div>
          </div>
        </div>

        <div class="footer-note">
          Official Player Pass • Tournament Dates: 29-31 Aug 2026<br/>
          Organizer Contact: Pintu Santra (89722144166)
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
    }, 300);
  };
}

export function openUserGuidePDF() {
  const printWindow = window.open('jsl_guide.html', '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    alert("Please allow popups to open the User Guide PDF.");
  }
}
