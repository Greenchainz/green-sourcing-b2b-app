export const INTELLIGENCE_FUNCTION_APP = {
  subscriptionId: "f9164e8d-d74d-43ea-98d4-b0466b3ef8b8",
  resourceGroup: "rg-greenchainz",
  appName: "greenchainz-scrapers-py",
} as const;

export const INTELLIGENCE_SCRAPERS = [
  { name: "supplier-contacts", label: "Supplier contacts scraper" },
  { name: "buyer-contacts", label: "Buyer contacts scraper" },
  { name: "drip-sequences", label: "Drip sequence runner" },
  { name: "salesforce-sync", label: "Salesforce lead sync" },
] as const;

