import type { Request, Response } from 'express';

// Interface matching LTA DataMall v3 BusArrival response structure
export interface BusServiceArrival {
  ServiceNo: string;
  Operator: 'SBST' | 'SMRT' | 'TTS' | 'GAS';
  NextBus?: {
    OriginCode: string;
    DestinationCode: string;
    EstimatedArrival: string;
    Latitude: string;
    Longitude: string;
    VisitNumber: string;
    Load: 'SEA' | 'SDA' | 'LSD'; // Seats Available | Standing Available | Limited Standing
    Feature: 'WAB' | ''; // Wheelchair Accessible Bus
    Type: 'SD' | 'DD' | 'BD'; // Single Deck | Double Deck | Bendy
  };
  NextBus2?: {
    OriginCode: string;
    DestinationCode: string;
    EstimatedArrival: string;
    Latitude: string;
    Longitude: string;
    VisitNumber: string;
    Load: 'SEA' | 'SDA' | 'LSD';
    Feature: 'WAB' | '';
    Type: 'SD' | 'DD' | 'BD';
  };
  NextBus3?: {
    OriginCode: string;
    DestinationCode: string;
    EstimatedArrival: string;
    Latitude: string;
    Longitude: string;
    VisitNumber: string;
    Load: 'SEA' | 'SDA' | 'LSD';
    Feature: 'WAB' | '';
    Type: 'SD' | 'DD' | 'BD';
  };
}

// Preset realistic schedules for top Singapore rendezvous spots
const POPULAR_BUS_STOPS: Record<string, { name: string; road: string; services: string[] }> = {
  '03059': { name: 'Opp The Sail / Lau Pa Sat', road: 'Marina Boulevard', services: ['10', '97', '100', '131', '196', '970'] },
  '03071': { name: 'Opp So/Sofitel (Lau Pa Sat)', road: 'Robinson Road', services: ['10', '57', '70', '100', '107', '130', '131', '167', '186', '196', '970'] },
  '05013': { name: 'Chinatown Station Exit E', road: 'Eu Tong Sen Street', services: ['2', '12', '33', '54', '61', '143', '147', '190', '851'] },
  '03509': { name: 'Marina Bay Sands Theatre', road: 'Bayfront Ave', services: ['97', '106', '133', '502', '518'] },
  '09048': { name: 'Lucky Plaza / Orchard Stn', road: 'Orchard Road', services: ['7', '14', '16', '65', '106', '111', '123', '175'] },
  '01112': { name: 'Bugis Station Exit A', road: 'Victoria Street', services: ['2', '12', '33', '130', '133'] },
};

function generateFallbackServices(busStopCode: string, requestedService?: string): BusServiceArrival[] {
  const info = POPULAR_BUS_STOPS[busStopCode] || {
    name: `Bus Stop #${busStopCode}`,
    road: 'Singapore Transit Network',
    services: ['10', '65', '100', '190'],
  };

  const servicesToGenerate = requestedService
    ? [requestedService]
    : info.services;

  const now = Date.now();

  return servicesToGenerate.map((svc, index) => {
    // Generate realistic arrival times in 1-15 min range
    const offset1 = (index * 3 + 2) % 12 + 1; // 1 to 12 mins
    const offset2 = offset1 + 8;
    const offset3 = offset2 + 12;

    const arrival1 = new Date(now + offset1 * 60 * 1000).toISOString();
    const arrival2 = new Date(now + offset2 * 60 * 1000).toISOString();
    const arrival3 = new Date(now + offset3 * 60 * 1000).toISOString();

    const loads: ('SEA' | 'SDA' | 'LSD')[] = ['SEA', 'SEA', 'SDA', 'LSD'];
    const types: ('SD' | 'DD' | 'BD')[] = ['DD', 'SD', 'DD'];
    const operators: ('SBST' | 'SMRT' | 'TTS' | 'GAS')[] = ['SBST', 'SMRT', 'TTS'];

    return {
      ServiceNo: svc,
      Operator: operators[index % operators.length],
      NextBus: {
        OriginCode: '03059',
        DestinationCode: '16009',
        EstimatedArrival: arrival1,
        Latitude: '1.2801',
        Longitude: '103.8505',
        VisitNumber: '1',
        Load: loads[index % loads.length],
        Feature: 'WAB',
        Type: types[index % types.length],
      },
      NextBus2: {
        OriginCode: '03059',
        DestinationCode: '16009',
        EstimatedArrival: arrival2,
        Latitude: '1.2780',
        Longitude: '103.8450',
        VisitNumber: '1',
        Load: loads[(index + 1) % loads.length],
        Feature: 'WAB',
        Type: types[(index + 1) % types.length],
      },
      NextBus3: {
        OriginCode: '03059',
        DestinationCode: '16009',
        EstimatedArrival: arrival3,
        Latitude: '1.2750',
        Longitude: '103.8400',
        VisitNumber: '1',
        Load: 'SEA',
        Feature: 'WAB',
        Type: 'SD',
      },
    };
  });
}

/**
 * Serverless function to fetch bus arrival times from LTA DataMall v3
 * Endpoint: GET https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=...
 */
export default async function handler(req: Request, res: Response) {
  const busStopCode = (req.query.BusStopCode as string) || (req.body?.BusStopCode as string) || '03059';
  const serviceNo = (req.query.ServiceNo as string) || (req.body?.ServiceNo as string);
  const ltaKey = process.env.LTA_ACCOUNT_KEY;

  res.setHeader('Content-Type', 'application/json');

  if (ltaKey && ltaKey.trim().length > 0) {
    try {
      const url = new URL('https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival');
      url.searchParams.set('BusStopCode', busStopCode);
      if (serviceNo) {
        url.searchParams.set('ServiceNo', serviceNo);
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
          source: 'LTA DataMall v3 BusArrival',
          BusStopCode: busStopCode,
          stopName: POPULAR_BUS_STOPS[busStopCode]?.name || `Bus Stop #${busStopCode}`,
          roadName: POPULAR_BUS_STOPS[busStopCode]?.road || 'Singapore Road',
          Services: data.Services || [],
        });
      } else {
        console.warn(`LTA DataMall returned status ${response.status} for BusStopCode ${busStopCode}. Using fallback data.`);
      }
    } catch (err: any) {
      console.error('LTA DataMall BusArrival fetch error:', err?.message || err);
    }
  }

  // Fallback simulator for Singapore stops when LTA_ACCOUNT_KEY is not yet provided
  const fallbackServices = generateFallbackServices(busStopCode, serviceNo);
  const stopMeta = POPULAR_BUS_STOPS[busStopCode] || {
    name: `Bus Stop #${busStopCode}`,
    road: 'Singapore Road Network',
    services: [],
  };

  return res.status(200).json({
    isLive: false,
    source: 'Singapore Transit Simulator (LTA DataMall schema compatible)',
    notice: 'Add LTA_ACCOUNT_KEY to environment variables to stream direct from live LTA DataMall v3 API.',
    BusStopCode: busStopCode,
    stopName: stopMeta.name,
    roadName: stopMeta.road,
    Services: fallbackServices,
  });
}
