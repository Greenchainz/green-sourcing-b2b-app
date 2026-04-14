import { systemRouter } from './_core/systemRouter';
import { router } from './_core/trpc';
import { rfqMarketplaceRouter } from './rfq-router';
import { supplierRouter } from './supplier-router';
import { supplierRfqRouter } from './supplier-rfq-router';
import { subscriptionRouter } from './subscription-router';
import { adminRouter } from './admin-router';
import { ec3Router } from './routers/ec3-router';
import { materialSpecRouter } from './routers/material-spec-router';
import { materialSwapRouter } from './routers/material-swap-router';
import { agentConfigRouter } from './agent-config-router';
import { legalRouter } from './legal-router';
import { autodesksDARouter } from './autodesk-sda-router';
import { txdotScraperRouter } from './routers/txdotScraper';
import { swapValidationRouter } from './routers/swapValidation';
import { rfqRouter } from './routers/rfq';
import { supplierOnboardingRouter } from './routers/supplier';
import { epdRouter } from './routers/epd';
import { locationRouter } from './routers/location';
import { architectRouter } from './routers/architect';
import { manufacturerRouter } from './manufacturer-router';
import { engagementRouter } from './engagement-router';
import { materialCreditScoreRouter } from './routers/material-credit-score';
import { crmRouter } from './routers/crm-router';
import { materialsRouter, assembliesRouter, assemblySpecsRouter, personasRouter } from './routers/materials-router';
import { messagingRouter } from './routers/messaging-router';
import { videoCallingRouter } from './routers/video-calling-router';
import { microsoftSubscriptionRouter } from './routers/microsoft-subscription-router';
import { notificationsRouter } from './routers/notifications-router';
import { authRouter, rfqInternalRouter, agentRouter, leadsRouter, materialSwapsRouter } from './routers/misc-router';

export const appRouter = router({
  system: systemRouter,
  rfqMarketplace: rfqMarketplaceRouter,
  supplier: supplierRouter,
  supplierRfq: supplierRfqRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  ec3: ec3Router,
  materialSpec: materialSpecRouter,
  materialSwap: materialSwapRouter,
  agentConfig: agentConfigRouter,
  legal: legalRouter,
  autodesk: autodesksDARouter,
  txdotScraper: txdotScraperRouter,
  swapValidation: swapValidationRouter,
  rfqRequests: rfqRouter,
  supplierOnboarding: supplierOnboardingRouter,
  architect: architectRouter,
  manufacturer: manufacturerRouter,
  engagement: engagementRouter,
  epd: epdRouter,
  location: locationRouter,
  materialCreditScore: materialCreditScoreRouter,
  crm: crmRouter,

  // Extracted from inline definitions
  assemblySpecs: assemblySpecsRouter,
  assemblies: assembliesRouter,
  personas: personasRouter,
  materials: materialsRouter,
  auth: authRouter,
  rfq: rfqInternalRouter,
  agent: agentRouter,
  leads: leadsRouter,
  materialSwaps: materialSwapsRouter,
  messaging: messagingRouter,
  videoCalling: videoCallingRouter,
  microsoftSubscription: microsoftSubscriptionRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
