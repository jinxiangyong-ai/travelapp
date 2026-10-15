import type { Request, Response } from 'express';

// Curated Singapore Whole Island Geospatial Nodes
const SG_WHOLE_ISLAND_FEATURES = [
  // 1. Bus Stops
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8505, 1.2801] },
    properties: {
      id: '03059',
      category: 'BusStop',
      name: 'Opp The Sail (Lau Pa Sat)',
      road: 'Marina Blvd',
      services: ['10', '97', '100', '131', '196', '970'],
      wheelchairAccessible: true,
      sheltered: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8496, 1.2804] },
    properties: {
      id: '03071',
      category: 'BusStop',
      name: 'Opp So/Sofitel (Lau Pa Sat)',
      road: 'Robinson Rd',
      services: ['10', '57', '70', '100', '107', '130', '131', '167', '186', '196', '970'],
      wheelchairAccessible: true,
      sheltered: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8447, 1.2850] },
    properties: {
      id: '05013',
      category: 'BusStop',
      name: 'Chinatown Stn Exit E',
      road: 'Eu Tong Sen St',
      services: ['2', '12', '33', '54', '61', '143', '147', '190', '851'],
      wheelchairAccessible: true,
      sheltered: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8587, 1.2835] },
    properties: {
      id: '03509',
      category: 'BusStop',
      name: 'Marina Bay Sands Theatre',
      road: 'Bayfront Ave',
      services: ['97', '106', '133', '502', '518'],
      wheelchairAccessible: true,
      sheltered: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8322, 1.3039] },
    properties: {
      id: '09048',
      category: 'BusStop',
      name: 'Lucky Plaza / Orchard Stn',
      road: 'Orchard Rd',
      services: ['7', '14', '16', '65', '106', '111', '123', '175'],
      wheelchairAccessible: true,
      sheltered: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8562, 1.3005] },
    properties: {
      id: '01112',
      category: 'BusStop',
      name: 'Bugis Stn Exit A',
      road: 'Victoria St',
      services: ['2', '12', '33', '130', '133'],
      wheelchairAccessible: true,
      sheltered: true,
    },
  },

  // 2. Official Singapore Taxi Stands
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8506, 1.2807] },
    properties: {
      id: 'E23',
      category: 'TaxiStand',
      name: 'Lau Pa Sat Taxi Stand (Boon Tat St)',
      capacity: 5,
      sheltered: true,
      barrierFree: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8512, 1.2831] },
    properties: {
      id: 'E18',
      category: 'TaxiStand',
      name: 'Raffles Place Republic Plaza',
      capacity: 8,
      sheltered: true,
      barrierFree: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8589, 1.2839] },
    properties: {
      id: 'E03',
      category: 'TaxiStand',
      name: 'Marina Bay Sands Hotel Tower 1',
      capacity: 15,
      sheltered: true,
      barrierFree: true,
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8449, 1.2852] },
    properties: {
      id: 'E09',
      category: 'TaxiStand',
      name: 'Chinatown Point Taxi Stand',
      capacity: 6,
      sheltered: true,
      barrierFree: true,
    },
  },

  // 3. MRT Stations
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8485, 1.2792] },
    properties: {
      id: 'DT18',
      category: 'TrainStation',
      name: 'Telok Ayer MRT (Downtown Line)',
      lines: ['DTL'],
      nearestExitToMeetup: 'Exit A (Cross St, 90m to Lau Pa Sat)',
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8515, 1.2839] },
    properties: {
      id: 'EW14-NS26',
      category: 'TrainStation',
      name: 'Raffles Place MRT (East-West & North-South)',
      lines: ['EWL', 'NSL'],
      nearestExitToMeetup: 'Exit I (Collyer Quay, 250m to Lau Pa Sat)',
    },
  },
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [103.8590, 1.2825] },
    properties: {
      id: 'DT16-CE1',
      category: 'TrainStation',
      name: 'Bayfront MRT (Downtown & Circle)',
      lines: ['DTL', 'CCL'],
      nearestExitToMeetup: 'Exit D (Marina Bay Sands & Gardens by the Bay)',
    },
  },
];

/**
 * Serverless endpoint for LTA GeospatialWholeIsland
 * Endpoint: GET https://datamall2.mytransport.sg/ltaodataservice/GeospatialWholeIsland
 */
export default async function handler(req: Request, res: Response) {
  const id = (req.query.ID as string) || (req.query.id as string);
  const ltaKey = process.env.LTA_ACCOUNT_KEY;

  res.setHeader('Content-Type', 'application/json');

  if (ltaKey && ltaKey.trim().length > 0) {
    try {
      const url = new URL('https://datamall2.mytransport.sg/ltaodataservice/GeospatialWholeIsland');
      if (id) {
        url.searchParams.set('ID', id);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          AccountKey: ltaKey,
          accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          isLive: true,
          source: 'LTA DataMall GeospatialWholeIsland',
          data,
        });
      } else {
        console.warn(`LTA GeospatialWholeIsland returned status ${response.status}. Using whole-island geospatial layer.`);
      }
    } catch (err: any) {
      console.error('LTA GeospatialWholeIsland fetch error:', err?.message || err);
    }
  }

  // Filter by category if ID requested
  let filtered = SG_WHOLE_ISLAND_FEATURES;
  if (id) {
    const idLower = id.toLowerCase();
    filtered = SG_WHOLE_ISLAND_FEATURES.filter(
      (f) =>
        f.properties.category.toLowerCase().includes(idLower) ||
        f.properties.id.toLowerCase().includes(idLower)
    );
  }

  return res.status(200).json({
    type: 'FeatureCollection',
    isLive: false,
    source: 'Singapore Whole Island Geospatial Transport Network',
    notice: 'Add LTA_ACCOUNT_KEY in .env to stream raw zip/layer from LTA DataMall GeospatialWholeIsland.',
    features: filtered,
    totalFeatures: filtered.length,
    layersAvailable: ['BusStopLocation', 'TaxiStand', 'TrainStation'],
  });
}
