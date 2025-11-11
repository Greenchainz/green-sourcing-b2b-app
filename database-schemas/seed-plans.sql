-- Seed Subscription Plans for Freemium Model

INSERT INTO Subscription_Plans (PlanName, PlanType, MonthlyPrice, AnnualPrice, MaxProducts, MaxCertifications, Features) 
VALUES 
  ('Free Tier', 'Free', 0.00, 0.00, 5, 2, '{"profile": true, "basic_search": true}'::jsonb),
  ('Professional', 'Pro', 49.00, 490.00, 50, 10, '{"profile": true, "advanced_search": true, "analytics": true, "priority_support": false}'::jsonb),
  ('Enterprise', 'Enterprise', 199.00, 1990.00, NULL, NULL, '{"profile": true, "advanced_search": true, "analytics": true, "priority_support": true, "custom_branding": true, "api_access": true}'::jsonb)
ON CONFLICT (PlanName) DO NOTHING;
