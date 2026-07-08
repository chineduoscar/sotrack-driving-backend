export interface Zone {
  id: number;
  name: string;
  lga: string;
  phoneNumber: string;
  price: number;
  lat: number;
  lng: number;
  locations: string[];
}

export const zones: Zone[] = [
  {
    id: 1,
    name: "Zone 1",
    lga: "PHALGA",
    phoneNumber: "08037466270",
    price: 50000,
    lat: 4.815,
    lng: 7.030,
    locations: ["Old GRA", "Secretariat", "Civic Centre"],
  },
  {
    id: 2,
    name: "Zone 2",
    lga: "PHALGA",
    phoneNumber: "08037466270",
    price: 50000,
    lat: 4.800,
    lng: 7.015,
    locations: ["Diobu", "D-Line", "Mile 1", "Mile 2"],
  },
  {
    id: 3,
    name: "Zone 3",
    lga: "Obio-Akpor",
    phoneNumber: "08037466270",
    price: 60000,
    lat: 4.865,
    lng: 6.980,
    locations: ["Mile 4", "Agip", "Ada George", "Wimpey"],
  },
  {
    id: 4,
    name: "Zone 4",
    lga: "Obio-Akpor",
    phoneNumber: "08037466270",
    price: 60000,
    lat: 4.900,
    lng: 6.920,
    locations: ["East-West Road", "Obiri-Ikwerre", "Uniport Axis"],
  },
  {
    id: 5,
    name: "Zone 5",
    lga: "Obio-Akpor",
    phoneNumber: "08037466270",
    price: 70000,
    lat: 4.890,
    lng: 7.020,
    locations: [
      "Eliozu",
      "SARS Road",
      "Rukpokwu",
      "Rumudara",
      "Eneka",
      "Tank",
      "Igwuruta",
    ],
  },
  {
    id: 6,
    name: "Zone 6",
    lga: "Obio-Akpor",
    phoneNumber: "08037466270",
    price: 70000,
    lat: 4.860,
    lng: 7.040,
    locations: [
      "Okporo",
      "Artillery",
      "Woji",
      "Old Aba Road",
      "Rumuomasi",
      "Elelenwo",
    ],
  },
  {
    id: 7,
    name: "Zone 7",
    lga: "PHALGA",
    phoneNumber: "08037466270",
    price: 50000,
    lat: 4.820,
    lng: 7.025,
    locations: ["Old GRA"],
  },
  {
    id: 8,
    name: "Zone 8",
    lga: "PHALGA / Obio-Akpor",
    phoneNumber: "08037466270",
    price: 65000,
    lat: 4.845,
    lng: 7.010,
    locations: [
      "New GRA",
      "Olu Obasanjo Road",
      "Orazi",
      "Secretariat Road",
      "Rumuigbo",
      "Rumuola",
    ],
  },
  {
    id: 9,
    name: "Zone 9",
    lga: "Ikwerre",
    phoneNumber: "08037466270",
    price: 70000,
    lat: 4.950,
    lng: 7.050,
    locations: ["Obibo"],
  },
];