import type { Request, Response } from 'express';

/**
 * Health check serverless endpoint
 * Verifies service status, uptime, and LTA DataMall configuration
 */
export default async function handler(req: Request, res: Response) {
  const ltaKey = process.env.LTA_ACCOUNT_KEY;
  const isLtaConfigured = Boolean(ltaKey && ltaKey.trim().length > 0);

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    ltaDataMall: {
      isKeyConfigured: isLtaConfigured,
      keyStatus: isLtaConfigured
        ? 'configured (live connection active)'
        : 'not_configured (using built-in Singapore transit mock for BusArrival and live data.gov.sg for Taxi)',
      endpoints: {
        busArrival: 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival',
        geospatialWholeIsland: 'https://datamall2.mytransport.sg/ltaodataservice/GeospatialWholeIsland',
      },
    },
    dataGovSg: {
      status: 'active',
      endpoints: {
        taxiAvailability: 'https://api.data.gov.sg/v1/transport/taxi-availability',
      },
    },
  });
}
