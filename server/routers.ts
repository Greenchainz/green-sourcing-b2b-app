import { systemRouter } from './_core/systemRouter';
import { router } from './_core/trpc';
import { rfqMarketplaceRouter } from './rfq-router';
import { supplierRouter } from './supplier-router';
import { supplierRfqRouter } from './supplier-rfq-router';
import { subscriptionRouter } from './subscription-router';
import { adminRouter } from './admin-router';
import { conciergeRouter } from './concierge-router';
import { suggestionsRouter } from './routers/suggestions-router';
import { ec3Router } from './routers/ec3-router';
import { materialSpecRouter } from './routers/material-spec-router';
import { materialSwapRouter } from './routers/material-swap-router';
import { agentConfigRouter } from './agent-config-router';
import { legalRouter } from './legal-router';
import { txdotScraperRouter } from './routers/txdotScraper';
import { swapValidationRouter } from './routers/swapValidation';
import { rfqRouter } from './routers/rfq';
import { supplierOnboardingRouter } from './routers/supplier';
import { epdRouter } from './routers/epd';
import { locationRouter } from './routers/location';
import { architectRouter } from './routers/architect';
import { architectSpecRouter } from './routers/architect-spec';
import { manufacturerRouter } from './manufacturer-router';
import { engagementRouter } from './engagement-router';
import { materialCreditScoreRouter } from './routers/material-credit-score';
import { crmRouter } from './routers/crm-router';
import { assemblySpecsRouter, assembliesRouter } from './routers/assemblies-router';
import { materialsRouter } from './routers/materials-router';
import { personasRouter } from './routers/personas-router';
import { messagingRouter } from './routers/messaging-router';
import { videoCallingRouter } from './routers/video-calling-router';
import { microsoftSubscriptionRouter } from './routers/microsoft-subscription-router';
import { notificationsRouter } from './routers/notifications-router';
import { authRouter, rfqInternalRouter, agentRouter, leadsRouter, materialSwapsRouter } from './routers/misc-router';
import { autodeskRouter } from './routers/autodesk-router';
import { featuredRouter } from './featured-router';
import { manufacturerSearchRouter } from './manufacturer-search-router';
import { founderVideoRouter } from './routers/founder-video';
import { catalogRouter } from './routers/catalog-router';
import { auditRouter } from './routers/audit-router';
import { sourcingRequestRouter } from './routers/sourcing-request-router';
import { supplierResponseRouter } from './routers/supplier-response-router';

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
  txdotScraper: txdotScraperRouter,
  swapValidation: swapValidationRouter,
  rfqRequests: rfqRouter,
  supplierOnboarding: supplierOnboardingRouter,
  architect: architectRouter,
  architectSpec: architectSpecRouter,
  manufacturer: manufacturerRouter,
  engagement: engagementRouter,
  epd: epdRouter,
  location: locationRouter,
  materialCreditScore: materialCreditScoreRouter,
  crm: crmRouter,

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
  concierge: conciergeRouter,
  suggestions: suggestionsRouter,
  autodesk: autodeskRouter,
  featured: featuredRouter,
  manufacturerSearch: manufacturerSearchRouter,
  founderVideo: founderVideoRouter,
  catalog: catalogRouter,
  auditLog: auditRouter,
  sourcingRequest: sourcingRequestRouter,
  supplierResponse: supplierResponseRouter,
});

export type AppRouter = typeof appRouter;
