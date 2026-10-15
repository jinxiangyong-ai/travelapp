import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

import healthHandler from './api/health.ts';
import busArrivalHandler from './api/busarrival.ts';
import taxiHandler from './api/taxi.ts';
import geospatialHandler from './api/geospatial.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serverless LTA DataMall & Singapore Open Data Transport Handlers
app.all('/api/health', (req, res) => healthHandler(req, res));
app.all('/api/busarrival', (req, res) => busArrivalHandler(req, res));
app.all('/api/bus-arrival', (req, res) => busArrivalHandler(req, res));
app.all('/api/taxi', (req, res) => taxiHandler(req, res));
app.all('/api/geospatial', (req, res) => geospatialHandler(req, res));


// Initialize Google GenAI client if key exists
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Singapore Local Gems & Hawker Insider API
app.post('/api/gemini/local-gems', async (req, res) => {
  const { destination = 'Singapore', groupType = 'Friends & Foodie Group', interests = ['Hawker Food', 'Heritage Shophouses', 'Hidden Rooftops', 'Night Culture'] } = req.body;

  if (ai) {
    try {
      const prompt = `You are a savvy local Singaporean insider and food guide living in Singapore.
A group of travelers (${groupType}) interested in ${interests.join(', ')} is visiting Singapore.
Provide 4 authentic, off-the-beaten-path hidden gems that typical tourists overlook (no generic Sentosa/Marina Bay clichés; focus on authentic local hawker corners, hidden heritage alleyways, tranquil nature, and neighborhood spots).
Include:
1. Title & authentic neighborhood (e.g. Tiong Bahru, Joo Chiat, Amoy Street, Gillman Barracks, Little India backstreets, Wessex Estate, Pulau Ubin)
2. Why locals love it
3. Best time to visit to avoid crowds or get the freshest batch
4. Insider secret tip (e.g. what specific stall number to order from, etiquette like 'chope', special coffee lingo)
5. Estimated budget level ($ to $$$$)

Return strictly valid JSON with this exact schema:
{
  "destination": "Singapore",
  "localGreeting": "string (Singlish/local greeting with translation, e.g., 'Wah, welcome to Singapore lah! Makan already?')",
  "culturalEtiquette": "string (essential local rule, e.g. 'Chope' table reserving with tissue packets, return tray laws, MRT eating bans)",
  "gems": [
    {
      "id": "gem-1",
      "name": "string",
      "category": "Hawker Heritage | Hidden Architecture | Scenic Viewpoint | Secret Nature",
      "neighborhood": "string",
      "bestTime": "string",
      "insiderTip": "string",
      "priceLevel": "string",
      "groupSuitability": "string"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      }
    } catch (err: any) {
      console.error('Gemini Singapore local-gems error:', err?.message || err);
    }
  }

  // Singapore Curated Fallback
  return res.json({
    destination: "Singapore",
    localGreeting: "Wah, welcome to Singapore lah! Makan already?",
    culturalEtiquette: "The Sacred 'Chope' Rule: If you see a packet of tissue paper or an umbrella resting on an empty hawker table, it is officially reserved! One member chopes the table while the rest fan out to queue.",
    gems: [
      {
        id: "gem-sg-1",
        name: "Old Airport Road Hawker Center (The Ultimate Feast)",
        category: "Hawker Heritage",
        neighborhood: "Geylang / Mountbatten",
        bestTime: "11:15am or 5:30pm (beats the peak lunchtime queues)",
        insiderTip: "Send one group member to queue for Dong Ji Fried Kway Teow (#01-138) and another for Nam Sing Hokkien Mee (#01-32). Order fresh sugar cane juice with lemon for the whole table.",
        priceLevel: "$",
        groupSuitability: "Round stone tables seating 6-8 people; perfect for sharing multiple dishes family-style."
      },
      {
        id: "gem-sg-2",
        name: "CapitaSpring Sky Garden & Secret Urban Farm",
        category: "Scenic Viewpoint",
        neighborhood: "CBD / Raffles Place (Level 51)",
        bestTime: "17:30 - 18:45 for golden hour sunset over Marina Bay",
        insiderTip: "Completely free open-air public observation deck on the 51st floor that 95% of tourists don't know exists. Requires no rooftop bar cover charge. Panoramic 360° views across the Singapore Strait to Indonesia.",
        priceLevel: "Free",
        groupSuitability: "Spacious winding garden paths with ample breeze; excellent group photo vantage point."
      },
      {
        id: "gem-sg-3",
        name: "Tiong Bahru 1930s Streamline Moderne Estate & Kopitiam",
        category: "Hidden Architecture",
        neighborhood: "Eng Hoon & Yong Siak Streets",
        bestTime: "08:30 - 10:30am for traditional breakfast",
        insiderTip: "Visit Hua Bee kopitiam (operating since the 1940s) for charcoal-toasted kaya toast and soft-boiled eggs splashed with dark soy sauce and white pepper. Order 'Kopi C Kosong' (coffee with evaporated milk, no sugar).",
        priceLevel: "$",
        groupSuitability: "Walkable tree-shaded heritage blocks with vintage independent bookstores."
      },
      {
        id: "gem-sg-4",
        name: "Pulau Ubin Chek Jawa Wetlands & Coastal Boardwalk",
        category: "Secret Nature",
        neighborhood: "Off Changi Point Ferry Terminal",
        bestTime: "Morning bumboat departure at 08:30am",
        insiderTip: "Hop on the $4 wooden bumboat at Changi Point. Rent bicycles for $10 and pedal through Singapore's last authentic 1960s rural kampong (village) to the coastal mangrove boardwalk.",
        priceLevel: "$",
        groupSuitability: "Great for active group cycling; stop at the jetty drink stall for fresh cold young coconut."
      }
    ]
  });
});

// 2. Singapore Group Consensus & Mediator API
app.post('/api/gemini/resolve-conflict', async (req, res) => {
  const { topic, options = [], memberNotes = '' } = req.body;

  if (ai) {
    try {
      const prompt = `You are an expert Singapore group travel planner and mediator.
The group is in Singapore and currently deadlocked regarding:
Topic: "${topic}"
Options under consideration: ${JSON.stringify(options)}
Group Context & Member notes: "${memberNotes}"

Propose a creative, balanced compromise tailored to Singapore (taking into account Singapore's efficient MRT transit, air-conditioned malls during midday heat, evening outdoor cooler weather, and vibrant hawker culture).

Return JSON format:
{
  "compromiseTitle": "string",
  "recommendedStrategy": "string",
  "suggestedSchedule": [
    { "time": "string", "plan": "string", "forWhom": "string" }
  ],
  "conciliatoryNote": "string (encouraging, friendly Singlish-tinged note for the group chat)"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text;
      if (text) {
        return res.json(JSON.parse(text));
      }
    } catch (err: any) {
      console.error('Gemini Singapore conflict resolver error:', err?.message || err);
    }
  }

  // Fallback Compromise
  return res.json({
    compromiseTitle: "Aircon Afternoon Split & Satay Street Reunion",
    recommendedStrategy: "During the 14:00-16:30 tropical humidity peak, split into Pod A (indoor National Gallery & air-conditioned cafe) and Pod B (Chinatown heritage heritage walk), then take the Downtown Line MRT to reunite at Lau Pa Sat for open-air satay skewers.",
    suggestedSchedule: [
      { time: "14:30 - 16:30", plan: "Pod A relaxes in the chilled National Gallery & craft coffee; Pod B explores Buddha Tooth Relic Temple & pagoda shophouses.", forWhom: "Split by walking vs chill preference" },
      { time: "17:15", plan: "Hop on Telok Ayer MRT (Exit A) to walk to Lau Pa Sat.", forWhom: "Reunited crew" },
      { time: "18:30", plan: "Chope big outdoor wooden table on Boon Tat Street for 50-stick chicken & mutton satay platter.", forWhom: "Entire group celebration" }
    ],
    conciliatoryNote: "No stress lah! Singapore is so compact that splitting for 2 hours and meeting for satay at dusk gives everyone the exact trip pace they want."
  });
});

// 3. Mount Vite Middleware or Serve Production Build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
