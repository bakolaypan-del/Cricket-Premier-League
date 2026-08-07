// Local Shops Data for Maa Laxmi Kitchen & Maa Laxmi Hardware & Sanitation

export const shops = [
  {
    id: "maa-laxmi-kitchen",
    name: "Maa Laxmi Kitchen (মা লক্ষ্মী কিচেন)",
    type: "restaurant",
    shortDesc: "✨ জিভে জল আনা স্বাদ, এবার আপনার দোরগোড়ায়! ঝাঁকরায় নিয়ে এলাম রেস্তোরাঁ স্বাদের খাস খানা। 🍗🍛",
    owner: "মা লক্ষ্মী কিচেন টিম (Maa Laxmi Kitchen Team)",
    phones: ["8777570477", "7029369901", "8167634108"],
    address: "ঝাঁকরা, পশ্চিম মেদিনীপুর (Jhankra, Paschim Medinipur)",
    image: "assets/maa_laxmi_kitchen.jpg",
    menuImage: "assets/maa_laxmi_menu_card.jpg",
    description: "ঝাঁকরার ভোজনরসিকদের জন্য সেরা ঠিকানা! মা লক্ষ্মী কিচেন নিয়ে এসেছে খাঁটি ঘরোয়া ও রেস্তোরাঁ স্টাইলের জিভে জল আনা সব খাবার। আমাদের তৈরি বিরিয়ানি থেকে শুরু করে মোমো ও তন্দুরি—প্রতিটি কামড়েই পাবেন অতুলনীয় স্বাদ। আজই অর্ডার করুন এবং উপভোগ করুন ঝাঁকরার সেরা খাবার!",
    features: [
      "নিকট দূরত্বে ফ্রি হোম ডেলিভারী (১কিমিঃ)",
      "অর্ডারের সময়ঃ বিকাল ৩ টা থেকে রাত্রি ১০ টা পর্যন্ত",
      "১০০% হাইজেনিক ও সুস্বাদু খাবারের নিশ্চয়তা"
    ],
    menu: {
      biryani: [
        { name: "মটন বিরিয়ানি (Mutton Biryani)", price: "250/-", img: "https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=400&q=80", desc: "সুগন্ধি বাসমতি চাল, রসালো মটন পিস, নরম আলু ও স্পেশাল মসলার রাজকীয় মেলবন্ধন।" },
        { name: "চিকেন বিরিয়ানি (Chicken Biryani)", price: "130/-", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80", desc: "মশলাদার সুস্বাদু চিকেন, নরম সেদ্ধ আলু ও সুগন্ধি চালের রাজকীয় যুগলবন্দি।" },
        { name: "ডিম বিরিয়ানি (Egg Biryani)", price: "100/-", img: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=400&q=80", desc: "বাসমতি চালের সাথে সেদ্ধ ডিম ও আলুর মশলাদার সুস্বাদু বিরিয়ানি।" },
        { name: "আলু বিরিয়ানি (Alu Biryani)", price: "80/-", img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80", desc: "বিরিয়ানির সুবাসে মাখানো মশলাদার আলু ও সুগন্ধি চালের মেলবন্ধন।" }
      ],
      rolls: [
        { name: "এগ রোল (Egg Roll)", price: "80/-", img: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=400&q=80", desc: "খাস্তা লাচ্ছা পরোটায় ডিমের প্রলেপ, কুচানো পেঁয়াজ ও সসের সুস্বাদু রোল।" },
        { name: "চিকেন এগ রোল (Egg + Chicken Roll)", price: "100/-", img: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=400&q=80", desc: "ডিমের সাথে মশলাদার রসালো চিকেন কিউবের স্টাফিং দেওয়া স্পেশাল রোল।" },
        { name: "পনির রোল (Paneer Roll)", price: "80/-", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80", desc: "নরম পনির ও সবজি দিয়ে তৈরি নিরামিষ ভোজনকারীদের সেরা পছন্দ।" }
      ],
      chowmin: [
        { name: "এগ চাউমিন (Egg Chowmin)", price: "80/-", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80", desc: "ডিম ও সবজির হালকা সতে করা মজাদার চাউমিন।" },
        { name: "চিকেন এগ চাউমিন (Egg + Chicken Chowmin)", price: "100/-", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80", desc: "চিকেনের কুচি, ডিম ও স্পেশাল মশলা দিয়ে তৈরি অসাধারণ স্বাদের চাউমিন।" },
        { name: "ভেজ চাউমিন (Veg Chowmin)", price: "60/-", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80", desc: "তাজা সবজি কুচি ও হালকা সস দিয়ে তৈরি সাধারণ ও মুখরোচক চাউমিন।" }
      ],
      moglai: [
        { name: "মোগলাই পরোটা (Moglai Paratha)", price: "100/-", img: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=400&q=80", desc: "ডিম ও মশলার পুর দিয়ে তৈরি সোনালী মচমচে ভাজা মোগলাই পরোটা।" }
      ],
      momos: [
        { name: "চিকেন মোমো (Chicken Momo - 6 Pcs)", price: "80/-", img: "https://images.unsplash.com/photo-1625220194771-7ebedd0b7d10?auto=format&fit=crop&w=400&q=80", desc: "ভেতরে নরম ও মশলাদার চিকেন স্টাফিং যুক্ত গরম গরম সেদ্ধ মোমো।" },
        { name: "ফ্রাইড মোমো (Fried Momo - 6 Pcs)", price: "100/-", img: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80", desc: "সোনালী করে ভাজা কড়কড়ে চিকেন মোমো ও ঝাল চাটনি।" }
      ],
      chickenSpecials: [
        { name: "চিকেন কষা (Chicken Kosa - 6 Pcs)", price: "80/-", img: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80", desc: "স্পেশাল মশলা দিয়ে কষানো বাঙালি স্টাইলের ঝাল ঝাল চিকেন কষা।" },
        { name: "চিকেন পকোড়া (Chicken Pakora - 6 Pcs)", price: "80/-", img: "https://images.unsplash.com/photo-1610057099443-fde8c4d90ef8?auto=format&fit=crop&w=400&q=80", desc: "বিকেলের নাস্তায় মুচমুচে কড়া ভাজা গরম গরম স্পাইসি চিকেন পকোড়া।" }
      ],
      tarka: [
        { name: "এগ তরকা (Egg Tarka)", price: "80/-", img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80", desc: "ডিমের ভুজিয়া দিয়ে রান্না করা মুখরোচক মশলাদার সবুজ মুগ ডাল তরকা।" },
        { name: "চিকেন এগ তরকা (Egg + Chicken Tarka)", price: "100/-", img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80", desc: "চিকেন কিউব ও ডিমের ডাবল স্বাদে ভরা আমাদের সিগনেচার মশলাদার তরকা।" }
      ],
      breads: [
        { name: "লাচ্ছা পরোটা (Lacha Paratha)", price: "20/-", img: "https://images.unsplash.com/photo-1627662236973-4f8259fa2441?auto=format&fit=crop&w=400&q=80", desc: "স্তরযুক্ত ও ঘিয়ে শেঁকা খাস্তা তন্দুরি লাচ্ছা পরোটা।" },
        { name: "আলু পরোটা (Alu Paratha)", price: "15/-", img: "https://images.unsplash.com/photo-1627582039413-5d46698ca152?auto=format&fit=crop&w=400&q=80", desc: "ধনেপাতা ও মশলার পুর ভরা আলু পরোটা।" },
        { name: "রুটি (Ruti)", price: "6/-", img: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=400&q=80", desc: "আটার তৈরি নরম গোল গরম গরম তাওয়া রুটি।" }
      ]
    }
  },
  {
    id: "maa-laxmi-hardware",
    name: "Maa Laxmi Hardware & Sanitation (মা লক্ষ্মী হার্ডওয়্যার ও স্যানিটেশন)",
    type: "hardware",
    shortDesc: "✨ আপনার স্বপ্নের বাড়ি সাজান সেরা স্যানিটারি সামগ্রী দিয়ে! সঠিক দাম ও সেরা মানের নিশ্চয়তা। 🏠🚿",
    owner: "সৌরভ ঘোষ (Sourav Ghosh)",
    phones: ["8777570477", "9007710194"],
    address: "ঝাঁকরা ( স্কুল বাজার ), পশ্চিম মেদিনীপুর (Jhankra School Bazar, Paschim Medinipur)",
    image: "assets/maa_laxmi_hardware.jpg",
    description: "ঝাঁকরা স্কুল বাজারে অবস্থিত মা লক্ষ্মী হার্ডওয়্যার ও স্যানিটেশনে আপনাকে স্বাগত। আমরা বাথরুম ফিটিংস, সি.পি ফিটিংস, ডিজাইনার মিরর, পি.টি.এম.টি ট্যাপ, আশীর্বাদ পাইপ এবং যাবতীয় স্যানিটারি সামগ্রীর খুচরো ও পাইকারী বিক্রেতা। সঠিক দাম ও উন্নত সেবার মাধ্যমে আপনার বাড়িকে সুন্দর করে তুলতে আমরা প্রতিশ্রুতিবদ্ধ।",
    features: [
      "উন্নত মানের বাথরুম ও সি.পি ফিটিংস",
      "ডিজাইনার মিরর এবং আকর্ষণীয় গ্লাস সামগ্রী",
      "দীর্ঘস্থায়ী আশীর্বাদ পাইপস ও ফিটিংস",
      "খুচরো ও পাইকারী সুলভ মূল্য",
      "বিশেষজ্ঞ পরামর্শ ও বিক্রয়োত্তর সেবা"
    ],
    products: [
      { name: "Ashirvad PVC & GI Pipes", category: "Pipes", spec: "All sizes available", type: "Wholesale & Retail" },
      { name: "Premium Brass & C.P. Taps", category: "Fittings", spec: "Rustproof double chrome plating", type: "Warranty backed" },
      { name: "PTMT Lightweight Designer Taps", category: "Fittings", spec: "Durable polymer construction", type: "Eco-friendly" },
      { name: "Designer Bathroom Mirrors", category: "Sanitary", spec: "LED and plain high definition glass", type: "Multiple shapes" },
      { name: "Sanitary Commode & Wash Basins", category: "Sanitary", spec: "Ceramic high glaze wash basins", type: "Standard sizes" },
      { name: "Complete Bathroom Fitting Set", category: "Fittings", spec: "Shower, wall mixers, and connection pipes", type: "Full Pack combo" }
    ]
  }
];
