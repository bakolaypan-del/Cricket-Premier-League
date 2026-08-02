// Seed Data for Jhankra Super League (JSL)

export const INITIAL_LEAGUES = [
  {
    id: "leg-jpl",
    code: "JPL",
    name: "JPL - Jhankra Premier League 2026",
    tagline: "The Flagship T20 League",
    category: "JPL",
    status: "COMING_SOON",
    entryFee: 1500,
    prizePool: "₹ 2,50,000",
    venue: "Jhankra Stadium Ground"
  },
  {
    id: "leg-jsl",
    code: "JSL",
    name: "JHANKRA SUPER LEAGUE 2026",
    tagline: "8 TEAM LEAGUE CRICKET TOURNAMENT",
    category: "JSL",
    status: "REGISTRATION_OPEN",
    teamEntryFee: 15000, // 15K
    playerEntryFee: 200,   // 200 Rupees for Player Entry
    prizeWinner: "35K",
    prizeRunners: "25K",
    auctionPurse: 8000,
    entryFeePortion: 7000,
    dates: "29, 30 & 31 AUGUST 2026",
    venue: "JHANKRA SCHOOL GROUND",
    ruleRestriction: "ONLY CHANDRAKONA TOWN PS PLAYERS ARE ALLOWED.",
    contactPerson: "PINTU",
    contactNumber: "89722144166",
    maxTeams: 8
  },
  {
    id: "leg-kpl",
    code: "KPL",
    name: "KPL - Kota Premier League 2026",
    tagline: "Kota Premier League",
    category: "KPL",
    status: "COMING_SOON",
    entryFee: 1000,
    prizePool: "₹ 1,80,000",
    venue: "Kota Sports Ground"
  }
];

export const INITIAL_TEAMS = [];
export const INITIAL_PLAYERS = [];
export const INITIAL_FIXTURES = [];
