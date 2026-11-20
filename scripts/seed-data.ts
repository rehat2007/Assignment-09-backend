// Seed fixture mirrored from:
//   fix_mate_front_end/src/lib/services.ts
//   fix_mate_front_end/src/lib/service-details.ts
//   fix_mate_front_end/src/lib/admin-data.ts
// MongoDB becomes the source of truth after seeding; update this fixture only
// if the demo data must be re-seeded.
import type { ServiceCategory, ServiceMode } from "../src/types/models.js";

export type SeedReview = {
  name: string;
  rating: number;
  text: string;
  at: string;
};

export type ServiceSeed = {
  legacyId: string;
  slug: string;
  title: string;
  category: ServiceCategory;
  description: string;
  location: string;
  duration: string;
  rating: number;
  reviewCount: number;
  technicianName: string;
  price: number;
  mode: ServiceMode;
  createdAt: string;
  includes: string[];
  warranty: string;
  availabilityNote: string;
  reviews: SeedReview[];
};

export type DemoUserSeed = {
  name: string;
  email: string;
  role: "customer" | "technician" | "admin";
  accountType: "customer" | "technician";
  phone: string;
  area: string;
  bio: string;
  joined: string;
  plan: "free" | "pro";
  rating?: number;
  jobs?: number;
};

export const SERVICE_SEEDS: ServiceSeed[] = [
  {
    "legacyId": "s1",
    "slug": "iphone-13-screen-replacement",
    "title": "iPhone 13 Screen Replacement",
    "category": "Smartphone",
    "description": "Cracked or unresponsive display? We replace the full OLED assembly with a tested original-grade panel. Includes a free battery health check and a 30-day warranty on the part.",
    "location": "Mirpur, Dhaka",
    "duration": "1–2 hours",
    "rating": 4.9,
    "reviewCount": 128,
    "technicianName": "Sadia Islam",
    "price": 49,
    "mode": "Home Visit",
    "createdAt": "2026-10-20",
    "includes": [
      "Original-grade OLED assembly",
      "True Tone & Face ID preserved",
      "Free battery health report",
      "30-day parts warranty"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": [
      {
        "name": "Imran Sheikh",
        "rating": 5,
        "text": "Came to my office, replaced the screen in 40 minutes and showed me the old panel. Flawless.",
        "at": "2026-11-04"
      },
      {
        "name": "Sumaiya Akter",
        "rating": 5,
        "text": "The only place that explained why my Face ID stopped working. Fixed properly, not just covered up.",
        "at": "2026-10-26"
      },
      {
        "name": "Rifat Chowdhury",
        "rating": 4,
        "text": "Great work, slightly late arrival but kept me updated the whole way.",
        "at": "2026-10-12"
      }
    ]
  },
  {
    "legacyId": "s2",
    "slug": "android-battery-replacement",
    "title": "Android Battery Replacement",
    "category": "Smartphone",
    "description": "Phone dying before 3pm? We test the cell, replace it with a fresh high-cycle battery, and run a full charge calibration before handing it back.",
    "location": "Dhanmondi, Dhaka",
    "duration": "45 min",
    "rating": 4.8,
    "reviewCount": 94,
    "technicianName": "Sadia Islam",
    "price": 29,
    "mode": "Shop Drop-off",
    "createdAt": "2026-09-28",
    "includes": [
      "Genuine-capacity battery",
      "Charge cycle calibration",
      "Old part returned to you",
      "15-day replacement warranty"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s3",
    "slug": "macbook-battery-service",
    "title": "MacBook Battery & Service",
    "category": "Laptop & PC",
    "description": "Full service for MacBooks with swollen or short-lived batteries. We replace the battery pack, clean the cooling assembly and verify charging behaviour under load.",
    "location": "Dhanmondi, Dhaka",
    "duration": "1 day",
    "rating": 4.9,
    "reviewCount": 61,
    "technicianName": "Sadia Islam",
    "price": 79,
    "mode": "Shop Drop-off",
    "createdAt": "2026-10-02",
    "includes": [
      "OEM-spec battery pack",
      "Thermal paste re-application",
      "Fan & vent cleaning",
      "Battery health report"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s4",
    "slug": "laptop-overheating-fan-cleaning",
    "title": "Laptop Overheating & Fan Cleaning",
    "category": "Laptop & PC",
    "description": "Laptop sounding like a jet engine? We strip the cooling assembly, clear the dust, replace dried thermal compound and stress-test the CPU.",
    "location": "Dhanmondi, Dhaka",
    "duration": "3–4 hours",
    "rating": 4.8,
    "reviewCount": 47,
    "technicianName": "Sadia Islam",
    "price": 39,
    "mode": "Shop Drop-off",
    "createdAt": "2026-09-16",
    "includes": [
      "Full teardown & dust removal",
      "Premium thermal compound",
      "Fan bearing lubrication",
      "Thermal stress test"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s5",
    "slug": "gaming-pc-ram-ssd-upgrade",
    "title": "Gaming PC RAM & SSD Upgrade",
    "category": "Laptop & PC",
    "description": "Give an older desktop a second life. We advise on compatible parts, fit your RAM or NVMe drive, clone your existing install and verify speeds before pickup.",
    "location": "Uttara, Dhaka",
    "duration": "2 hours",
    "rating": 4.7,
    "reviewCount": 38,
    "technicianName": "Nayeem Chowdhury",
    "price": 25,
    "mode": "Shop Drop-off",
    "createdAt": "2026-08-30",
    "includes": [
      "Compatibility check",
      "Drive cloning to new SSD",
      "Benchmark before & after",
      "Cable management"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s6",
    "slug": "split-ac-deep-cleaning",
    "title": "Split AC Deep Cleaning",
    "category": "AC",
    "description": "A proper deep clean, not a spray-and-wipe. We remove the indoor unit, wash the coils and blower, clear the drain line and check gas pressure.",
    "location": "Mirpur, Dhaka",
    "duration": "2–3 hours",
    "rating": 4.9,
    "reviewCount": 203,
    "technicianName": "Rakib Hasan",
    "price": 45,
    "mode": "Home Visit",
    "createdAt": "2026-11-05",
    "includes": [
      "Coil & blower deep wash",
      "Drain line flush",
      "Gas pressure check",
      "Filter sanitisation"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": [
      {
        "name": "Tanvir Ahmed",
        "rating": 5,
        "text": "Showed up on time with a full kit. The water that came out of that unit was alarming. Cooling is noticeably better.",
        "at": "2026-11-12"
      },
      {
        "name": "Nusrat Jahan",
        "rating": 5,
        "text": "Very tidy — covered the floor and cleaned up afterwards. Booked him again for my parents’ unit.",
        "at": "2026-10-29"
      },
      {
        "name": "Mehedi Hasan",
        "rating": 4,
        "text": "Good service overall. Took a bit longer than the estimate but did a thorough job.",
        "at": "2026-10-08"
      }
    ]
  },
  {
    "legacyId": "s7",
    "slug": "ac-gas-refill-leak-test",
    "title": "AC Gas Refill & Leak Test",
    "category": "AC",
    "description": "AC running but not cooling? We pressure-test the circuit, find and seal leaks, vacuum the system and refill with R32/R410a refrigerant to spec.",
    "location": "Mirpur, Dhaka",
    "duration": "3–4 hours",
    "rating": 4.8,
    "reviewCount": 88,
    "technicianName": "Rakib Hasan",
    "price": 65,
    "mode": "Home Visit",
    "createdAt": "2026-09-24",
    "includes": [
      "Nitrogen leak pressure test",
      "Brazing & seal repair",
      "Vacuum + gas refill",
      "Cooling performance reading"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s8",
    "slug": "refrigerator-cooling-repair",
    "title": "Refrigerator Cooling Repair",
    "category": "Refrigerator",
    "description": "Fridge warm at the bottom or freezing everything? We diagnose the thermostat, compressor, relay and gas circuit, then quote before starting.",
    "location": "Mirpur, Dhaka",
    "duration": "1 day",
    "rating": 4.8,
    "reviewCount": 71,
    "technicianName": "Rakib Hasan",
    "price": 55,
    "mode": "Home Visit",
    "createdAt": "2026-10-09",
    "includes": [
      "Full cooling system diagnosis",
      "Compressor & relay testing",
      "Gas top-up if required",
      "No-fix, no-fee policy"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s9",
    "slug": "refrigerator-door-seal-replacement",
    "title": "Refrigerator Door Seal Replacement",
    "category": "Refrigerator",
    "description": "If your fridge sweats or runs all day, the magnetic door gasket is usually the culprit. We replace perished seals, align the door and re-test the temperature.",
    "location": "Dhanmondi, Dhaka",
    "duration": "2 hours",
    "rating": 4.6,
    "reviewCount": 29,
    "technicianName": "Rakib Hasan",
    "price": 35,
    "mode": "Home Visit",
    "createdAt": "2026-08-22",
    "includes": [
      "Custom-fit magnetic gasket",
      "Door hinge alignment",
      "Temperature hold test",
      "20-day fitting warranty"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s10",
    "slug": "smart-tv-backlight-panel-repair",
    "title": "Smart TV Backlight & Panel Repair",
    "category": "TV",
    "description": "Dark screen but sound working? That is usually a failed backlight strip. We replace the strips, test the power board and recalibrate the panel.",
    "location": "Dhanmondi, Dhaka",
    "duration": "1–2 days",
    "rating": 4.9,
    "reviewCount": 112,
    "technicianName": "Sadia Islam",
    "price": 89,
    "mode": "Shop Drop-off",
    "createdAt": "2026-11-02",
    "includes": [
      "Full backlight strip set",
      "Power board inspection",
      "Panel calibration",
      "Free pickup & drop (3 km)"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": [
      {
        "name": "Farhan Kabir",
        "rating": 5,
        "text": "My 55\" Sony was declared dead elsewhere. Sadia fixed the backlight for a fraction of a new TV.",
        "at": "2026-10-21"
      },
      {
        "name": "Imran Sheikh",
        "rating": 5,
        "text": "Clear diagnosis, honest pricing, and they returned it a day early.",
        "at": "2026-10-05"
      }
    ]
  },
  {
    "legacyId": "s11",
    "slug": "washing-machine-drum-cleaning",
    "title": "Washing Machine Drum Cleaning",
    "category": "Washing Machine",
    "description": "Clothes smelling musty? We dismantle the drum, remove lint build-up and scale, sanitise the tub and clean the filter and drain pump.",
    "location": "Mirpur, Dhaka",
    "duration": "2 hours",
    "rating": 4.7,
    "reviewCount": 54,
    "technicianName": "Rakib Hasan",
    "price": 32,
    "mode": "Home Visit",
    "createdAt": "2026-11-08",
    "includes": [
      "Drum removal & descaling",
      "Filter and pump clean",
      "Food-grade sanitiser",
      "Leak check after refit"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s12",
    "slug": "washing-machine-motor-repair",
    "title": "Washing Machine Motor Repair",
    "category": "Washing Machine",
    "description": "Machine not spinning or tripping the breaker? We test the motor, capacitor and control board, then repair or replace the faulty part.",
    "location": "Uttara, Dhaka",
    "duration": "1 day",
    "rating": 4.7,
    "reviewCount": 33,
    "technicianName": "Nayeem Chowdhury",
    "price": 58,
    "mode": "Home Visit",
    "createdAt": "2026-11-11",
    "includes": [
      "Motor & capacitor testing",
      "Belt / coupling replacement",
      "Drain cycle verification",
      "6-month part warranty"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s13",
    "slug": "home-electrical-wiring-inspection",
    "title": "Home Electrical Wiring Inspection",
    "category": "Electrical",
    "description": "A safety audit for your flat or small office. We test every circuit, check earthing and breaker ratings, and give you a written report with photos.",
    "location": "Uttara, Dhaka",
    "duration": "2–4 hours",
    "rating": 4.8,
    "reviewCount": 26,
    "technicianName": "Nayeem Chowdhury",
    "price": 40,
    "mode": "Home Visit",
    "createdAt": "2026-11-11",
    "includes": [
      "Circuit-by-circuit testing",
      "Earthing & RCD check",
      "Photo report with findings",
      "Prioritised fix list"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s14",
    "slug": "ceiling-fan-installation",
    "title": "Ceiling Fan Installation",
    "category": "Electrical",
    "description": "New fan or replacing an old one? We mount the hook safely, balance the blades, wire the regulator and test all speeds.",
    "location": "Mirpur, Dhaka",
    "duration": "1 hour",
    "rating": 4.6,
    "reviewCount": 41,
    "technicianName": "Nayeem Chowdhury",
    "price": 18,
    "mode": "Home Visit",
    "createdAt": "2026-11-14",
    "includes": [
      "Secure hook & mount fitting",
      "Blade balancing",
      "Regulator wiring",
      "Speed and wobble test"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  },
  {
    "legacyId": "s15",
    "slug": "cctv-camera-setup",
    "title": "CCTV Camera Setup (4 cameras)",
    "category": "Electrical",
    "description": "Complete 4-camera installation with cabling, DVR configuration, mobile app access and a walkthrough of the playback system.",
    "location": "Uttara, Dhaka",
    "duration": "1 day",
    "rating": 4.8,
    "reviewCount": 19,
    "technicianName": "Nayeem Chowdhury",
    "price": 75,
    "mode": "Home Visit",
    "createdAt": "2026-11-16",
    "includes": [
      "4 x 2MP camera mounting",
      "Cable routing & connectors",
      "DVR + mobile app setup",
      "Playback walkthrough"
    ],
    "warranty": "30 days on workmanship",
    "availabilityNote": "Tomorrow, 9:00 AM",
    "reviews": []
  }
];

export const DEMO_USERS: DemoUserSeed[] = [
  {
    "name": "Ayesha Rahman",
    "email": "customer@fixmate.dev",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1712 345678",
    "area": "Dhanmondi, Dhaka",
    "bio": "Product designer. I keep my devices forever, so I fix instead of replace.",
    "joined": "2026-01-14",
    "plan": "free"
  },
  {
    "name": "Rakib Hasan",
    "email": "rakib@fixmate.dev",
    "role": "technician",
    "accountType": "technician",
    "phone": "+880 1811 220034",
    "area": "Mirpur, Dhaka",
    "bio": "AC & home appliance specialist with 8 years of field experience. 640+ jobs completed, factory-trained on inverter systems.",
    "joined": "2025-08-02",
    "plan": "pro",
    "rating": 4.9,
    "jobs": 642
  },
  {
    "name": "Sadia Islam",
    "email": "sadia@fixmate.dev",
    "role": "technician",
    "accountType": "technician",
    "phone": "+880 1913 778899",
    "area": "Dhanmondi, Dhaka",
    "bio": "Board-level phone and laptop repair. Apple-certified (2021), micro-soldering specialist. I explain the fault before I touch a screwdriver.",
    "joined": "2025-11-19",
    "plan": "pro",
    "rating": 4.9,
    "jobs": 418
  },
  {
    "name": "Nayeem Chowdhury",
    "email": "nayeem@fixmate.dev",
    "role": "technician",
    "accountType": "technician",
    "phone": "+880 1620 445566",
    "area": "Uttara, Dhaka",
    "bio": "Licensed electrician and appliance technician. Smart-home installs, wiring safety audits and CCTV setup.",
    "joined": "2026-02-08",
    "plan": "pro",
    "rating": 4.7,
    "jobs": 233
  },
  {
    "name": "Arif Hossain",
    "email": "admin@fixmate.dev",
    "role": "admin",
    "accountType": "customer",
    "phone": "+880 1700 000111",
    "area": "Gulshan, Dhaka",
    "bio": "Platform operations & technician quality.",
    "joined": "2025-06-01",
    "plan": "pro"
  },
  {
    "name": "Tanvir Ahmed",
    "email": "tanvir@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1555 902211",
    "area": "Mirpur, Dhaka",
    "bio": "",
    "joined": "2026-03-21",
    "plan": "free"
  },
  {
    "name": "Mehedi Hasan",
    "email": "mehedi@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1777 334455",
    "area": "Bashundhara, Dhaka",
    "bio": "",
    "joined": "2026-04-07",
    "plan": "free"
  },
  {
    "name": "Nusrat Jahan",
    "email": "nusrat@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1888 112233",
    "area": "Mohammadpur, Dhaka",
    "bio": "",
    "joined": "2026-05-30",
    "plan": "free"
  },
  {
    "name": "Farhan Kabir",
    "email": "farhan@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1999 556677",
    "area": "Uttara, Dhaka",
    "bio": "",
    "joined": "2026-07-12",
    "plan": "free"
  },
  {
    "name": "Sumaiya Akter",
    "email": "sumaiya@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1611 889900",
    "area": "Gulshan, Dhaka",
    "bio": "",
    "joined": "2026-09-09",
    "plan": "free"
  },
  {
    "name": "Imran Sheikh",
    "email": "imran@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1512 665544",
    "area": "Banani, Dhaka",
    "bio": "",
    "joined": "2026-10-18",
    "plan": "free"
  },
  {
    "name": "Rifat Chowdhury",
    "email": "rifat@mail.com",
    "role": "customer",
    "accountType": "customer",
    "phone": "+880 1744 223344",
    "area": "Mirpur, Dhaka",
    "bio": "",
    "joined": "2026-11-02",
    "plan": "free"
  }
];
