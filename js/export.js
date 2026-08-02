// Export & Printing Utility Module for PDF & CSV (Developer: Suman Kolay - User Guide PDF Release)

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

// GENERATE PROFESSIONAL PRINTABLE PDF DOCUMENT FOR REGISTERED PLAYERS WITH HD PHOTOS
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
      <td style="text-align: center; width: 75px;">
        <img src="${p.photoUrl || 'assets/jsl_logo.jpg'}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1.5px solid #0F172A; box-shadow: 0 2px 4px rgba(0,0,0,0.15);" />
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
        th, td { border: 1px solid #CBD5E1; padding: 8px; text-align: left; vertical-align: middle; }
        th { background-color: #0F172A; color: white; font-weight: bold; text-align: center; }
        tr:nth-child(even) { background-color: #F8FAFC; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header-box">
        <h1 class="title">JHANKRA SUPER LEAGUE (JSL 2026)</h1>
        <div class="subtitle">Official Registered Players Directory (HD Printable List)</div>
        <div class="meta">Generated: ${new Date().toLocaleString()} • Total Players: ${players.length}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">Serial</th>
            <th style="width: 75px;">Photo</th>
            <th>Player Name</th>
            <th>Category</th>
            <th>Phone</th>
            <th>Address</th>
            <th style="width: 80px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// PRINT DIGITAL PASS FOR INDIVIDUAL PLAYER
export function printDigitalPass(player, league, team) {
  if (!player) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print pass.');
    return;
  }

  const isApproved = player.paymentStatus === 'APPROVED';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JSL Digital Pass - ${player.name}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #020617; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .pass-card { width: 340px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 2px solid #f59e0b; border-radius: 20px; padding: 20px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
        .pass-card::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%); pointer-events: none; }
        .league-title { font-size: 18px; font-weight: 900; color: #f59e0b; letter-spacing: 1px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .league-sub { font-size: 9px; font-weight: bold; color: #38bdf8; text-transform: uppercase; margin-top: 2px; }
        .serial-badge { display: inline-block; background: #020617; color: #f59e0b; border: 1px solid #f59e0b; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; font-family: monospace; margin: 12px 0 10px 0; }
        .player-photo { width: 110px; height: 110px; border-radius: 16px; object-fit: cover; border: 3px solid #38bdf8; margin: 0 auto 10px auto; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
        .player-name { font-size: 20px; font-weight: 900; color: #ffffff; margin: 0; }
        .player-cat { font-size: 12px; font-weight: bold; color: #38bdf8; margin-top: 2px; }
        .info-grid { background: rgba(2, 6, 23, 0.8); border: 1px solid #334155; border-radius: 12px; padding: 10px; margin-top: 12px; text-align: left; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .info-item span { display: block; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: bold; }
        .info-item div { font-weight: bold; color: #f8fafc; }
        .status-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 900; margin-top: 12px; text-transform: uppercase; }
        .status-ok { background: #065f46; color: #6ee7b7; border: 1px solid #10b981; }
        .status-pend { background: #881337; color: #fca5a5; border: 1px solid #f43f5e; }
        .footer { margin-top: 12px; font-size: 8px; color: #64748b; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="pass-card">
        <h2 class="league-title">JHANKRA SUPER LEAGUE</h2>
        <div class="league-sub">Official Player Entry Pass • JSL 2026</div>
        
        <div class="serial-badge">SERIAL NO: ${player.serialNo || 1} • ${player.regNo || 'JSL-2026-001'}</div>
        
        <img src="${player.photoUrl}" class="player-photo" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'" />
        
        <h3 class="player-name">${player.name}</h3>
        <div class="player-cat">${player.category || player.role}</div>

        <div class="info-grid">
          <div class="info-item">
            <span>Mobile Phone</span>
            <div>${player.phone || 'N/A'}</div>
          </div>
          <div class="info-item">
            <span>Address</span>
            <div>${player.address || 'Chandrakona PS'}</div>
          </div>
        </div>

        <div class="status-pill ${isApproved ? 'status-ok' : 'status-pend'}">
          ${isApproved ? '✓ VERIFIED & APPROVED' : '⚠ PENDING ADMIN PAYMENT APPROVAL'}
        </div>

        <div class="footer">
          Developer: Suman Kolay • Organizer Contact: Pintu Santra (89722144166)
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

// --- GENERATE COLOURFUL STYLISH BILINGUAL USER GUIDE PDF (ENGLISH & BENGALI) ---
export function openUserGuidePDF() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open/download the User Guide PDF.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JSL 2026 - Registration & System Guide PDF (English & বাংলা)</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Inter:wght@400;700;900&display=swap');
        
        body { 
          font-family: 'Inter', 'Hind Siliguri', Arial, sans-serif; 
          background-color: #f8fafc; 
          color: #0f172a; 
          padding: 25px; 
          margin: 0;
          line-height: 1.5;
        }

        .container {
          max-w: 800px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 2px solid #e2e8f0;
        }

        .header-box { 
          text-align: center; 
          background: linear-gradient(135deg, #0b192c 0%, #1e3a8a 100%); 
          color: white;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 25px;
          border: 2px solid #f59e0b;
        }

        .title { 
          font-size: 26px; 
          font-weight: 900; 
          color: #f59e0b; 
          margin: 0;
          letter-spacing: 0.5px;
        }

        .subtitle { 
          font-size: 15px; 
          font-weight: 700; 
          color: #38bdf8; 
          margin-top: 6px; 
        }

        .meta { 
          font-size: 12px; 
          color: #cbd5e1; 
          margin-top: 8px; 
          font-weight: 600;
        }

        .section-card {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .section-title {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          border-left: 5px solid #0284c7;
          padding-left: 10px;
          margin-top: 0;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bengali-title {
          font-size: 14px;
          color: #0369a1;
          font-weight: 700;
        }

        ol, ul {
          margin: 0;
          padding-left: 20px;
        }

        li {
          margin-bottom: 8px;
          font-size: 13px;
        }

        .highlight-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }

        .badge-red { background: #ffe4e6; color: #e11d48; border: 1px solid #fda4af; }
        .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }

        .status-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 10px;
        }

        .status-item {
          padding: 12px;
          border-radius: 10px;
          font-size: 12px;
        }

        .status-item-red {
          background: #fff1f2;
          border: 1.5px solid #f43f5e;
          color: #881337;
        }

        .status-item-green {
          background: #f0fdf4;
          border: 1.5px solid #10b981;
          color: #064e3b;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          border-top: 2px solid #e2e8f0;
          padding-top: 15px;
          font-weight: 700;
        }

        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; border: none; }
        }
      </style>
    </head>
    <body>

      <div class="container">
        
        <!-- HEADER BOX -->
        <div class="header-box">
          <h1 class="title">JHANKRA SUPER LEAGUE (JSL 2026)</h1>
          <div class="subtitle">Official User Guide & Registration Manual • সিস্টেম ও রেজিস্ট্রেশন নির্দেশিকা</div>
          <div class="meta">Tournament Dates: 29, 30 & 31 AUG 2026 @ Jhankra School Ground</div>
        </div>

        <!-- STEP 1: PLAYER REGISTRATION -->
        <div class="section-card">
          <div class="section-title">
            <span>1. How a Player Can Register • প্লেয়ার রেজিস্ট্রেশনের নিয়ম</span>
          </div>
          <ol>
            <li><strong>Open JSL Hub / JSL পেজে যান:</strong> Click on <strong>JSL</strong> from the main league selector. (হোম পেজ থেকে JSL-এ ক্লিক করুন)।</li>
            <li><strong>Click "Registration Here" / রেজিস্ট্রেশন বাটনে ক্লিক করুন:</strong> Look at Column 3 (Right side) and click the blinking <strong>"Registration Here"</strong> button. (ডানপাশের কলামে blinking লাল বাটনে ক্লিক করুন)।</li>
            <li><strong>Select "Part 2: Player Register" / প্লেয়ার রেজিস্ট্রেশন নির্বাচন করুন:</strong> Entry Fee is <strong>₹ 200 Rupees</strong> (এন্ট্রি ফি ২০০ টাকা)।</li>
            <li><strong>Fill Player Details / তথ্য পূরণ করুন:</strong> Enter Full Name, Phone Number, Full Address, and select Player Category (Right/Left Batsman, Bowler, All Rounder, Wicketkeeper).</li>
            <li><strong>Upload Photo & Proof / ফটো আপলোড করুন:</strong> Upload player photo and Aadhar Card (Back side proof).</li>
            <li><strong>Payment & UPI Reference / পেমেন্ট ইউপিআই তথ্য:</strong> Pay ₹200 via PhonePe, GPay, or UPI to <strong>pintusantra4166@nyes</strong>. Enter the UPI Transaction Reference Number and upload payment screenshot. (ইউপিআই নম্বর লিখে স্ক্রিনশট আপলোড করে ফর্ম জমা দিন)।</li>
          </ol>
        </div>

        <!-- STEP 2: TEAM OWNER REGISTRATION -->
        <div class="section-card">
          <div class="section-title">
            <span>2. How a Team Owner Can Register • টিম ওনার রেজিস্ট্রেশন নিয়ম</span>
          </div>
          <ol>
            <li><strong>Click "Part 1: Team Register" / টিম রেজিস্টারে ক্লিক করুন:</strong> Select Part 1 Team Register from the menu.</li>
            <li><strong>Entry Fee / এন্ট্রি ফি:</strong> Total ₹ 15,000 (8K Auction Purse Budget + 7K Entry Fee).</li>
            <li><strong>Enter Team Details / টিমের তথ্য প্রদান করুন:</strong> Provide Team Name, Owner Name, Owner Phone Number, Co-Owner details, and upload the official Team Logo.</li>
            <li><strong>Submit / জমা দিন:</strong> Submit team application to list your franchise for auction.</li>
          </ol>
        </div>

        <!-- STEP 3: CHECK REGISTERED COUNT -->
        <div class="section-card">
          <div class="section-title">
            <span>3. How to Check Registered Teams & Players Count • প্লেয়ার ও টিম সংখ্যা দেখার নিয়ম</span>
          </div>
          <ul>
            <li><strong>JSL Hub Overview:</strong> In JSL Hub, <strong>Column 1</strong> displays total registered teams, and <strong>Column 2</strong> displays total registered players count in real-time. (JSL Hub-এ রিয়েল টাইম সংখ্যা দেখায়)।</li>
            <li><strong>View Teams & Players / সম্পূর্ণ লিস্ট দেখুন:</strong> Click <strong>"View Teams"</strong> or <strong>"View Players"</strong> to see team/player photos in medium square format.</li>
            <li><strong>Real-Time Search / অনুসন্ধান করুন:</strong> Use the top search bar in the modal to search any player by name, phone, category, or address.</li>
          </ul>
        </div>

        <!-- STEP 4: MEANING OF RED AND GREEN CIRCLE INDICATORS -->
        <div class="section-card">
          <div class="section-title">
            <span>4. Meaning of Red 🔴 & Green 🟢 Circle Indicators • রেড এবং গ্রীন বিন্দুর অর্থ</span>
          </div>
          <div class="status-box">
            
            <div class="status-item status-item-red">
              <strong style="font-size: 14px;">🔴 RED Circle (PENDING / প্যান্ডিং)</strong>
              <p style="margin: 6px 0 0 0;">
                <strong>English:</strong> Registration has been submitted successfully, but payment verification is currently <strong>PENDING</strong> approval by Master Admin.<br/>
                <strong>বাংলা:</strong> আপনার রেজিস্ট্রেশন জমা হয়েছে, কিন্তু ফি পেমেন্ট এখনো মাস্টার অ্যাডমিন দ্বারা ভেরিফাই ও অ্যাপ্রুভ হওয়া বাকি আছে।
              </p>
            </div>

            <div class="status-item status-item-green">
              <strong style="font-size: 14px;">🟢 GREEN Circle (APPROVED / অ্যাপ্রুভড)</strong>
              <p style="margin: 6px 0 0 0;">
                <strong>English:</strong> Payment has been verified & approved by Master Admin. Registration is <strong>CONFIRMED</strong>!<br/>
                <strong>বাংলা:</strong> অ্যাডমিন পেমেন্ট চেক করে কনফার্ম করেছেন। আপনার রেজিস্ট্রেশন সম্পূর্ণ সফল ও অ্যাপ্রুভড!
              </p>
            </div>

          </div>
        </div>

        <!-- FOOTER & CONTACT -->
        <div class="footer">
          🏏 <strong>JHANKRA SUPER LEAGUE (JSL 2026) OFFICIAL PORTAL</strong><br/>
          Organizer Contact: <strong>Pintu Santra (📞 89722144166)</strong> • System Developer: <strong>Suman Kolay</strong><br/>
          Website: <span style="color: #0284c7;">https://cricket-premier-league.vercel.app</span>
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
