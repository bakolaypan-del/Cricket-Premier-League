// Export & Printing Utility Module for PDF & CSV (Developer: Suman Kolay)

export function exportPlayersToCSV(players) {
  if (!players || players.length === 0) {
    alert('No player data available to export.');
    return;
  }

  const headers = ['Serial No', 'Player ID', 'Full Name', 'Phone', 'Address', 'Category', 'Payment Ref', 'Payment Status', 'Reg Date'];
  const rows = players.map(p => [
    p.serialNo || '',
    p.id || '',
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${p.phone || ''}"`,
    `"${(p.address || '').replace(/"/g, '""')}"`,
    `"${p.category || p.role || ''}"`,
    `"${p.paymentRef || ''}"`,
    p.paymentStatus || 'PENDING',
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

  const headers = ['Team ID', 'Team Name', 'Short Code', 'Owner Name', 'Owner Phone', 'Co-Owner Name', 'Co-Owner Phone', 'Reg Date'];
  const rows = teams.map(t => [
    t.id || '',
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.shortCode || '',
    `"${(t.ownerName || '').replace(/"/g, '""')}"`,
    `"${t.ownerPhone || ''}"`,
    `"${(t.coOwnerName || '').replace(/"/g, '""')}"`,
    `"${t.coOwnerPhone || ''}"`,
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

// GENERATE PROFESSIONAL PRINTABLE PDF DOCUMENT FOR REGISTERED PLAYERS
export function exportPlayersToPDF(players) {
  if (!players || players.length === 0) {
    alert('No players found to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the PDF.');
    return;
  }

  const rowsHtml = players.map((p, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold;">S-${p.serialNo || (idx + 1)}</td>
      <td style="text-align: center;">
        <img src="${p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc;" />
      </td>
      <td style="font-weight: bold; color: #0F172A;">${p.name}</td>
      <td style="color: #0284C7; font-weight: bold;">${p.category || p.role || 'Player'}</td>
      <td style="font-family: monospace;">${p.phone || 'N/A'}</td>
      <td style="font-size: 11px;">${p.address || 'Chandrakona Town PS'}</td>
      <td style="text-align: center; font-weight: bold; color: ${p.paymentStatus === 'APPROVED' ? '#10B981' : '#EF476F'};">
        ${p.paymentStatus === 'APPROVED' ? 'APPROVED' : 'PENDING'}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JSL 2026 - Registered Players List PDF</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1E293B; }
        .header-box { text-align: center; border-bottom: 2px solid #0F172A; padding-bottom: 15px; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: 900; color: #0B192C; margin: 0; }
        .subtitle { font-size: 14px; font-weight: bold; color: #DC2626; margin-top: 4px; }
        .meta { font-size: 11px; color: #64748B; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background-color: #0F172A; color: #FFFFFF; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px; border-bottom: 1px solid #E2E8F0; vertical-align: middle; }
        tr:nth-child(even) { background-color: #F8FAFC; }
        .footer { text-align: center; margin-top: 25px; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 10px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <h1 class="title">JHANKRA SUPER LEAGUE 2026</h1>
        <div class="subtitle">OFFICIAL REGISTERED PLAYERS DIRECTORY</div>
        <div class="meta">Total Players: ${players.length} | Generated on: ${new Date().toLocaleDateString()} | Developer: Suman Kolay</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Serial</th>
            <th style="width: 70px; text-align: center;">Photo</th>
            <th>Player Name</th>
            <th>Category</th>
            <th>Phone</th>
            <th>Address</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        Jhankra Super League Official Tournament & Registration Portal • Developer: Suman Kolay
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function printDigitalPass(player, league, team) {
  if (!player) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print Digital Pass.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Digital Player Pass - ${player.name}</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
        .pass-card { width: 340px; background: white; border: 2px solid #0f172a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .header { background: #0f172a; color: white; padding: 14px; text-align: center; }
        .header h2 { margin: 0; font-size: 16px; font-weight: 800; color: #f59e0b; }
        .body { padding: 16px; text-align: center; }
        .photo { width: 90px; height: 90px; border-radius: 12px; object-fit: cover; border: 3px solid #f59e0b; margin: 0 auto 10px; }
        .name { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
        .role { font-size: 12px; font-weight: bold; color: #0284c7; background: #e0f2fe; display: inline-block; padding: 2px 8px; border-radius: 6px; margin-bottom: 12px; }
        .details { text-align: left; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .details div { margin-bottom: 4px; }
        .footer { background: #f1f5f9; padding: 8px; text-align: center; font-size: 9px; color: #64748b; font-weight: bold; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="pass-card">
        <div class="header">
          <h2>JHANKRA SUPER LEAGUE 2026</h2>
          <div style="font-size:10px; color:#cbd5e1;">OFFICIAL DIGITAL PLAYER PASS</div>
        </div>
        <div class="body">
          <img src="${player.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}" class="photo" />
          <div class="name">${player.name}</div>
          <div class="role">${player.category || player.role || 'Player'}</div>
          
          <div class="details">
            <div><strong>Serial No:</strong> S-${player.serialNo || 1}</div>
            <div><strong>Phone:</strong> ${player.phone || 'N/A'}</div>
            <div><strong>Address:</strong> ${player.address || 'Chandrakona Town PS'}</div>
            <div><strong>Payment Ref:</strong> ${player.paymentRef || 'N/A'}</div>
            <div><strong>Status:</strong> ${player.paymentStatus || 'PENDING'}</div>
          </div>
        </div>
        <div class="footer">Developer - Suman Kolay • Official Tournament Pass</div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
