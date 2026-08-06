# Cricket Premier League - Official Tournament & Registration Portal

> **Official Web & Mobile Application for Cricket Premier League (JPL, JSL, KPL)**  
> **Developer:** Suman Kolay  
> **Admin ID:** `bakolaypan@gmail.com`  

---

## 🏏 Overview

**Cricket Premier League** is a responsive web application designed for cricket tournament organizers, captains, franchise owners, and players.

It features full support for three tournament categories:
1. **JPL** (Jhankra Premier League) - *Coming Soon*
2. **JSL** (Jhankra Super League) - **Registration Live!**
3. **KPL** (Kota Premier League) - *Coming Soon*

---

## ✨ Features

- **Responsive Landing Page**: Clean white background design featuring category boxes for JPL, JSL, and KPL.
- **Persistent Blinking Registration Button**: Continuous glowing animation directing users to registration.
- **Two-Part Registration Portal**:
  - **Part 1: Team Register**: Franchise team name, owner, phone, co-owner, and logo file upload.
  - **Part 2: Player Register**: Full name, phone, address, player category, photo upload, Aadhar back photo upload, and UPI payment receipt verification.
- **Navi UPI Payment Integration**:
  - **Payee**: Pintu Santra
  - **UPI ID**: `pintusantra4166@nyes`
  - **Navi QR Code Display**: Direct mobile scanning for ₹ 200 entry fee.
  - **1-Click Deep Links**: PhonePe, GPay, and Any UPI app handlers.
- **Sequential Serial Numbers & Status Circles**:
  - Automatically assigns `Serial 1`, `Serial 2`, etc.
  - **Red Circle (`🔴 PENDING`)**: Awaiting payment approval.
  - **Green Circle (`🟢 APPROVED`)**: Approved payment status.
- **Master Admin Control Panel**:
  - Locked behind admin credentials.
  - Approve/Reject payment receipts, view Aadhar proofs, and export master CSV data.
- **Digital Player Pass Generator**: Download printable digital pass cards for approved players.

---

## 🚀 How to Run Locally

1. Clone or download this repository.
2. Open PowerShell in the project directory.
3. Launch the lightweight web server:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\server.ps1
   ```
4. Open your browser at `http://localhost:8080/`.

---

## 🛠️ Built With

- **HTML5 & Vanilla Javascript (ES6 Modules)**
- **Tailwind CSS** (via CDN)
- **Lucide Icons**
- **Supabase Client** (`@supabase/supabase-js`)
- **PowerShell HTTP Listener**
