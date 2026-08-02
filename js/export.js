// Data Export & Digital Pass Generator for Cricket Premier League

export function exportPlayersToCSV(players, leagues, teams) {
  if (!players || players.length === 0) {
    alert("No player data available to export.");
    return;
  }

  const leagueMap = new Map(leagues.map(l => [l.id, l.name]));
  const teamMap = new Map(teams.map(t => [t.id, t.name]));

  const headers = [
    "Reg No", "Full Name", "Phone", "Email", "League Name",
    "Role", "Batting Style", "Bowling Style", "T-Shirt Size",
    "T-Shirt No", "Payment Status", "Payment Ref No", "Team",
    "Base Price (INR)", "Sold Price (INR)", "Reg Date"
  ];

  const rows = players.map(p => [
    `"${p.regNo || ''}"`,
    `"${p.name || ''}"`,
    `"${p.phone || ''}"`,
    `"${p.email || ''}"`,
    `"${leagueMap.get(p.leagueId) || 'General'}"`,
    `"${p.role || ''}"`,
    `"${p.battingStyle || ''}"`,
    `"${p.bowlingStyle || ''}"`,
    `"${p.tshirtSize || ''}"`,
    `"${p.tshirtNumber || ''}"`,
    `"${p.paymentStatus || ''}"`,
    `"${p.paymentRef || ''}"`,
    `"${teamMap.get(p.teamId) || 'Unassigned'}"`,
    `"${p.basePrice || 0}"`,
    `"${p.soldPrice || 0}"`,
    `"${p.regDate || ''}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCSVFile(csvContent, `CPL_Registered_Players_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportTeamsToCSV(teams, leagues, players) {
  if (!teams || teams.length === 0) {
    alert("No team data available to export.");
    return;
  }

  const leagueMap = new Map(leagues.map(l => [l.id, l.name]));

  const headers = [
    "Team Short Code", "Team Name", "League", "Captain Name",
    "Captain Phone", "Squad Count", "Max Capacity", "Purse Spent (INR)", "Purse Budget (INR)"
  ];

  const rows = teams.map(t => [
    `"${t.shortCode || ''}"`,
    `"${t.name || ''}"`,
    `"${leagueMap.get(t.leagueId) || 'General'}"`,
    `"${t.captainName || ''}"`,
    `"${t.captainPhone || ''}"`,
    `"${t.squadCount || 0}"`,
    `"${t.maxSquad || 15}"`,
    `"${t.purseSpent || 0}"`,
    `"${t.purseBudget || 50000}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadCSVFile(csvContent, `CPL_Registered_Teams_${new Date().toISOString().split('T')[0]}.csv`);
}

export function downloadCSVFile(content, fileName) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printDigitalPass(player, league, team) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  const statusColor = player.paymentStatus === 'APPROVED' ? '#10B981' : '#F59E0B';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Digital Player Registration Pass - ${player.name}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #0b132b;
          color: #ffffff;
          padding: 40px;
          display: flex;
          justify-content: center;
        }
        .ticket-card {
          width: 480px;
          background: linear-gradient(135deg, #1c2541 0%, #0b132b 100%);
          border: 2px solid #3a506b;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          position: relative;
          overflow: hidden;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #3a506b;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: 800;
          color: #ffd166;
          letter-spacing: 1px;
          margin: 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 13px;
          color: #a0aec0;
          margin-top: 5px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          background: ${statusColor};
          color: #000;
          margin-top: 10px;
          text-transform: uppercase;
        }
        .player-info {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 20px;
        }
        .avatar {
          width: 100px;
          height: 100px;
          border-radius: 16px;
          object-fit: cover;
          border: 3px solid #ffd166;
        }
        .details h2 {
          margin: 0;
          font-size: 22px;
          color: #ffffff;
        }
        .details p {
          margin: 4px 0;
          color: #cbd5e1;
          font-size: 14px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: rgba(255,255,255,0.05);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .item label {
          font-size: 11px;
          color: #94a3b8;
          display: block;
          text-transform: uppercase;
        }
        .item span {
          font-size: 15px;
          font-weight: 600;
          color: #f8fafc;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2px dashed #3a506b;
          padding-top: 20px;
        }
        .qr-placeholder {
          background: #ffffff;
          padding: 8px;
          border-radius: 8px;
          color: #000;
          font-weight: 800;
          font-size: 11px;
          text-align: center;
        }
        @media print {
          body { background: white; color: black; }
          .ticket-card { border-color: #000; background: #fff; color: #000; }
          .details h2, .item span { color: #000; }
          .subtitle, .details p, .item label { color: #444; }
        }
      </style>
    </head>
    <body>
      <div class="ticket-card">
        <div class="header">
          <h1 class="title">${league ? league.name : 'CRICKET PREMIER LEAGUE'}</h1>
          <div class="subtitle">OFFICIAL PLAYER REGISTRATION DIGITAL PASS</div>
          <div class="status-badge">PAYMENT STATUS: ${player.paymentStatus}</div>
        </div>

        <div class="player-info">
          <img class="avatar" src="${player.photoUrl}" alt="${player.name}" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
          <div class="details">
            <h2>${player.name}</h2>
            <p><strong>Reg No:</strong> ${player.regNo}</p>
            <p><strong>Role:</strong> ${player.role}</p>
            <p><strong>Team:</strong> ${team ? team.name : 'Unassigned (Draft Eligible)'}</p>
          </div>
        </div>

        <div class="grid">
          <div class="item"><label>Batting Style</label><span>${player.battingStyle}</span></div>
          <div class="item"><label>Bowling Style</label><span>${player.bowlingStyle}</span></div>
          <div class="item"><label>T-Shirt Size</label><span>Size ${player.tshirtSize} (#${player.tshirtNumber})</span></div>
          <div class="item"><label>Base Price</label><span>₹ ${player.basePrice}</span></div>
        </div>

        <div class="footer">
          <div>
            <p style="margin:0; font-size:12px; color:#94a3b8;">Issued On: ${player.regDate}</p>
            <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Ref: ${player.paymentRef}</p>
          </div>
          <div class="qr-placeholder">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h-3zM18 18h3v3h-3zM15 18h3v3h-3z"/></svg>
            <div>VERIFIED PASS</div>
          </div>
        </div>
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
