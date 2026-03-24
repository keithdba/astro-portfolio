export interface Vehicle {
  id: string;
  name: string;
  year: string;
  model: string;
  description: string;
  modifications: string[];
  futurePlans?: string;
  shortStory?: string;
  heroImage: string;
  gallery: string[];
}

export const projectVehicles: Vehicle[] = [
  {
    id: "ram-1500",
    name: "Ram 1500",
    year: "2023",
    model: "Sport 5.7L Hemi eTorque, 3.92:1 gears",
    description: "Daily driver with a focus on utility and camping/overlanding and occasional off-road capability.",
    modifications: [
      "2.3 inch Bilstein Leveling kit",
      "33x11 inch Falken Wildpeak A/T4W tires",
      "Leer 100R canopy",
      "Tuxmat floor mats",
      "Front Tow hooks",
      "Molle panel box racking system"
    ],
    futurePlans: "Platform style aluminum extrusion roof rack",
    shortStory: "This truck has been the perfect all purpose vehicle for weekend projects and long hauls. The Hemi provides plenty of power, and the Sport trim makes the interior a great place to be.",
    heroImage: "/assets/auto/RAM-1500-Hero.jpeg",
    gallery: [
      "/assets/auto/RAM-1500-Hero.jpeg",
      "/assets/auto/RAM-1500-canopy.jpeg",
      "/assets/auto/RAM-1500-canopy2.jpg",
      "/assets/auto/RAM-1500-molle1.jpeg",
      "/assets/auto/RAM-1500-molle2.jpeg",
      "/assets/auto/RAM-1500-web_Lift1.jpg",
      "/assets/auto/RAM-1500-web_Step1.jpg",
      "/assets/auto/RAM-1500-web_Step2.jpg",
      "/assets/auto/RAM-1500-web_Tire2.jpg",
      "/assets/auto/RAM-1500-web_Tuxmat2.jpg",
      "/assets/auto/RAM-1500-web_Tuxmat3.jpg",
      "/assets/auto/RAM-1500-web_box1.jpg",
      "/assets/auto/RAM-1500_web_UCA.jpg"
    ]
  },
  {
    id: "fusion-ecoboost",
    name: "Fusion EcoBoost 'Jackal'",
    year: "2014",
    model: "Ford Fusion SE 2.0L EB AWD",
    description: "The sleeper sedan. Tuned 2.0L EB with AWD with a Cobb Accessport v3 by Stratified Automotive, blending performance with comfort.",
    modifications: [
      "Stratified Automotive 94 Octane Tune",
      "Snokel delete + K&N Drop in filter",
      "Steeda Rear Sway Bar, and strut tower brace",
      "20% all around window tint",
      "Bilstein B4 Dampers",
      "General GMAX AS-05 235/45R18"
    ],
    futurePlans: "Sold",
    shortStory: "Most people think it's just another commuter car until they hear the turbo spool. The Stratified tune really wakes up the 2.0L EcoBoost engine.",
    heroImage: "/assets/auto/fusion-sport-hero.png",
    gallery: [
      "/assets/auto/fusion-sport-hero.png"
    ]
  },
  {
    id: "tj-wrangler",
    name: "TJ Wrangler Theodore",
    year: "2002",
    model: "Jeep Wrangler Sport 4.0L I6",
    description: "The dedicated trail rig. Simple, rugged, and capable of going almost anywhere.",
    modifications: [
      "3\" Suspension lift",
      "33\" Mud-terrain tires",
      "9,500lb Winch with synthetic line",
      "Front and rear steel bumpers",
      "LED headlight conversion"
    ],
    futurePlans: "Armor! Differential skids and beefier rock sliders are coming soon.",
    shortStory: "There's nothing quite like the sound of the 4.0L straight-six in the canyons. It's not fast, but it will crawl over anything.",
    heroImage: "/assets/auto/tj-wrangler-hero.png",
    gallery: [
      "/assets/auto/tj-wrangler-hero.png"
    ]
  },
  {
    id: "4runner",
    name: "4Runner",
    year: "2018",
    model: "Toyota 4Runner TRD Off-Road",
    description: "The overlanding platform. Built for long-distance travel and reliability in the wild.",
    modifications: [
      "Old Man Emu 2.5 inch lift kit",
      "Bolt-on rock sliders",
      "Sport Rack full-length roof rack",
      "Dick Cepek Trail Country EXP 31x11.5R16",
      "Green and beautiful"
    ],
    futurePlans: "Dual battery system and an onboard air compressor for airing back up after trails.",
    heroImage: "/assets/auto/4runner-hero.png",
    gallery: [
      "/assets/auto/4runner-hero.png"
    ]
  },
  {
    id: "cherokee-xj",
    name: "Cherokee XJ",
    year: "1999",
    model: "Jeep Cherokee Classic 4.0L I6",
    description: "Classic XJ boxy goodness. Built for rock crawling and technical trails.",
    modifications: [
      "4.5\" Long arm suspension lift",
      "35\" Mud-terrain tires",
      "Dana 44 rear axle swap",
      "Slip-yoke eliminator (SYE)",
      "Cut and fold rear quarters"
    ],
    futurePlans: "Roll cage and harness for more aggressive wheeling.",
    shortStory: "This XJ has seen a lot of rocks. It's beaten and bruised, but it never stops. The long arm kit made a massive difference in articulation.",
    heroImage: "/assets/auto/cherokee-xj-hero.png",
    gallery: [
      "/assets/auto/cherokee-xj-hero.png"
    ]
  },
  {
    id: "1982-toyota",
    name: "1982 Toyota",
    year: "1982",
    model: "Toyota Pickup (Hilux) 22R",
    description: "The ultimate crawler. More tractor than truck at this point.",
    modifications: [
      "Straight axle swap (SAS)",
      "37\" Maxxis Trepador tires",
      "Dual transfer cases (Marlin Crawler)",
      "Full internal roll cage",
      "Hydro-assist steering"
    ],
    futurePlans: "Maybe a turbo setup for the 22R, but the dual cases make the low range insane already.",
    shortStory: "This truck is older than me but still going strong. The crawl ratio with the dual cases is something you have to experience to believe.",
    heroImage: "/assets/auto/toyota-82-hero.png",
    gallery: [
      "/assets/auto/toyota-82-hero.png"
    ]
  }
];
