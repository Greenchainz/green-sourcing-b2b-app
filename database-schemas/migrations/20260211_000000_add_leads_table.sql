-- Migration: Add leads table for tool waitlist signups
-- Created: 2026-02-11

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    company VARCHAR(255),
    tool_name VARCHAR(100) NOT NULL,
    source VARCHAR(50) DEFAULT 'website',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate signups for same tool
    UNIQUE(email, tool_name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_tool_name ON leads(tool_name);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Add comment
COMMENT ON TABLE leads IS 'Tool waitlist signups from landing pages';
COMMENT ON COLUMN leads.tool_name IS 'Excel Audit, Browser Extension, Revit Plugin, or Submittal Generator';
