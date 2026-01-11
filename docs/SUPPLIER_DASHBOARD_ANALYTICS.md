# Supplier Dashboard Analytics SQL Queries

## Overview

SQL queries for building a comprehensive supplier dashboard showing:
- Total RFQs responded to
- Average response time
- Win rate (awarded RFQs)
- Response rates by material type
- Distance statistics
- Certification match rates
- Performance trends over time

## Database Schema Reference

**Tables:**
- `Users` - Supplier user data (primary key: `UserID`)
- `rfqs` - RFQ data (primary key: `id`)
- `rfq_responses` - Supplier responses to RFQs (primary key: `id`)
- `rfq_supplier_matches` - RFQ-supplier matching table

---

## Query 1: Total RFQs Responded To

Get total count of RFQs a supplier has responded to.

```sql
-- Total RFQs Responded To
SELECT 
  COUNT(DISTINCT rfq_id) as total_rfqs_responded,
  COUNT(*) as total_responses
FROM rfq_responses
WHERE supplier_id = $1;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "total_rfqs_responded": 45,
  "total_responses": 45
}
```

---

## Query 2: Average Response Time

Calculate average time between RFQ creation and supplier response.

```sql
-- Average Response Time (hours)
SELECT 
  AVG(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as avg_response_hours,
  MIN(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as min_response_hours,
  MAX(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as max_response_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as median_response_hours
FROM rfq_responses rr
JOIN rfqs r ON rr.rfq_id = r.id
WHERE rr.supplier_id = $1;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "avg_response_hours": 12.5,
  "min_response_hours": 0.5,
  "max_response_hours": 72.0,
  "median_response_hours": 8.0
}
```

---

## Query 3: Win Rate (Awarded RFQs)

Calculate percentage of RFQs that were awarded to this supplier.

```sql
-- Win Rate (Awarded RFQs)
SELECT 
  COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) as awarded_count,
  COUNT(*) as total_responded,
  ROUND(
    COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as win_rate_percent
FROM rfq_responses rr
JOIN rfqs r ON rr.rfq_id = r.id
WHERE rr.supplier_id = $1
  AND r.status IN ('awarded', 'closed');
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "awarded_count": 12,
  "total_responded": 45,
  "win_rate_percent": 26.67
}
```

---

## Query 4: Response Rates by Material Type

Break down RFQ responses by material type.

```sql
-- Response Rates by Material Type
SELECT 
  r.material_type,
  COUNT(*) as response_count,
  COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) as awarded_count,
  ROUND(
    COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as win_rate_percent,
  AVG(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as avg_response_hours
FROM rfq_responses rr
JOIN rfqs r ON rr.rfq_id = r.id
WHERE rr.supplier_id = $1
GROUP BY r.material_type
ORDER BY response_count DESC;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
[
  {
    "material_type": "Concrete",
    "response_count": 18,
    "awarded_count": 6,
    "win_rate_percent": 33.33,
    "avg_response_hours": 10.5
  },
  {
    "material_type": "Steel",
    "response_count": 15,
    "awarded_count": 4,
    "win_rate_percent": 26.67,
    "avg_response_hours": 14.2
  }
]
```

---

## Query 5: Distance Statistics

Calculate average distance to RFQs responded to and distance distribution.

```sql
-- Distance Statistics
SELECT 
  AVG(rsm.distance_miles) as avg_distance_miles,
  MIN(rsm.distance_miles) as min_distance_miles,
  MAX(rsm.distance_miles) as max_distance_miles,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rsm.distance_miles) as median_distance_miles,
  COUNT(CASE WHEN rsm.distance_miles <= 25 THEN 1 END) as within_25_miles,
  COUNT(CASE WHEN rsm.distance_miles > 25 AND rsm.distance_miles <= 50 THEN 1 END) as within_50_miles,
  COUNT(CASE WHEN rsm.distance_miles > 50 THEN 1 END) as over_50_miles
FROM rfq_responses rr
JOIN rfq_supplier_matches rsm ON rr.rfq_id = rsm.rfq_id AND rr.supplier_id = rsm.supplier_id
WHERE rr.supplier_id = $1;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "avg_distance_miles": 32.5,
  "min_distance_miles": 5.2,
  "max_distance_miles": 87.3,
  "median_distance_miles": 28.1,
  "within_25_miles": 18,
  "within_50_miles": 22,
  "over_50_miles": 5
}
```

---

## Query 6: Certification Match Rate

Calculate how often supplier certifications match RFQ requirements.

```sql
-- Certification Match Rate
WITH rfq_certs AS (
  SELECT 
    r.id as rfq_id,
    UNNEST(r.certifications_required) as required_cert
  FROM rfqs r
  WHERE r.certifications_required IS NOT NULL
    AND array_length(r.certifications_required, 1) > 0
),
supplier_certs AS (
  SELECT 
    UserID,
    UNNEST(certifications) as supplier_cert
  FROM Users
  WHERE UserID = $1
    AND certifications IS NOT NULL
    AND jsonb_array_length(certifications::jsonb) > 0
),
matched_certs AS (
  SELECT DISTINCT
    rc.rfq_id,
    COUNT(*) OVER (PARTITION BY rc.rfq_id) as matched_count,
    COUNT(*) OVER (PARTITION BY rc.rfq_id) * 100.0 / NULLIF(
      (SELECT COUNT(*) FROM rfq_certs WHERE rfq_id = rc.rfq_id),
      0
    ) as match_percent
  FROM rfq_certs rc
  JOIN supplier_certs sc ON LOWER(rc.required_cert) = LOWER(sc.supplier_cert)
)
SELECT 
  AVG(match_percent) as avg_cert_match_percent,
  COUNT(*) as rfqs_with_cert_requirements,
  COUNT(CASE WHEN match_percent = 100 THEN 1 END) as perfect_matches,
  COUNT(CASE WHEN match_percent >= 50 AND match_percent < 100 THEN 1 END) as partial_matches,
  COUNT(CASE WHEN match_percent < 50 THEN 1 END) as low_matches
FROM matched_certs;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "avg_cert_match_percent": 78.5,
  "rfqs_with_cert_requirements": 30,
  "perfect_matches": 18,
  "partial_matches": 10,
  "low_matches": 2
}
```

---

## Query 7: Performance Trends Over Time

Get monthly performance trends (responses, win rate, average response time).

```sql
-- Performance Trends Over Time (Monthly)
SELECT 
  DATE_TRUNC('month', rr.created_at) as month,
  COUNT(*) as responses_count,
  COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) as awarded_count,
  ROUND(
    COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as win_rate_percent,
  AVG(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as avg_response_hours,
  AVG(rsm.distance_miles) as avg_distance_miles
FROM rfq_responses rr
JOIN rfqs r ON rr.rfq_id = r.id
LEFT JOIN rfq_supplier_matches rsm ON rr.rfq_id = rsm.rfq_id AND rr.supplier_id = rsm.supplier_id
WHERE rr.supplier_id = $1
  AND rr.created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', rr.created_at)
ORDER BY month DESC;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
[
  {
    "month": "2025-01-01T00:00:00Z",
    "responses_count": 8,
    "awarded_count": 3,
    "win_rate_percent": 37.50,
    "avg_response_hours": 9.2,
    "avg_distance_miles": 28.5
  },
  {
    "month": "2024-12-01T00:00:00Z",
    "responses_count": 12,
    "awarded_count": 4,
    "win_rate_percent": 33.33,
    "avg_response_hours": 11.8,
    "avg_distance_miles": 32.1
  }
]
```

---

## Query 8: Comprehensive Dashboard Summary

Combined query for dashboard overview with all key metrics.

```sql
-- Comprehensive Dashboard Summary
WITH supplier_stats AS (
  SELECT 
    COUNT(DISTINCT rr.rfq_id) as total_responded,
    COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) as total_awarded,
    AVG(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as avg_response_hours,
    AVG(rsm.distance_miles) as avg_distance_miles
  FROM rfq_responses rr
  JOIN rfqs r ON rr.rfq_id = r.id
  LEFT JOIN rfq_supplier_matches rsm ON rr.rfq_id = rsm.rfq_id AND rr.supplier_id = rsm.supplier_id
  WHERE rr.supplier_id = $1
),
recent_performance AS (
  SELECT 
    COUNT(*) as recent_responses,
    COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) as recent_awarded
  FROM rfq_responses rr
  JOIN rfqs r ON rr.rfq_id = r.id
  WHERE rr.supplier_id = $1
    AND rr.created_at >= NOW() - INTERVAL '30 days'
),
material_breakdown AS (
  SELECT 
    r.material_type,
    COUNT(*) as count
  FROM rfq_responses rr
  JOIN rfqs r ON rr.rfq_id = r.id
  WHERE rr.supplier_id = $1
  GROUP BY r.material_type
  ORDER BY count DESC
  LIMIT 5
)
SELECT 
  ss.total_responded,
  ss.total_awarded,
  ROUND(ss.total_awarded * 100.0 / NULLIF(ss.total_responded, 0), 2) as win_rate_percent,
  ROUND(ss.avg_response_hours, 1) as avg_response_hours,
  ROUND(ss.avg_distance_miles, 1) as avg_distance_miles,
  rp.recent_responses,
  rp.recent_awarded,
  ROUND(rp.recent_awarded * 100.0 / NULLIF(rp.recent_responses, 0), 2) as recent_win_rate_percent,
  json_agg(json_build_object('material_type', mb.material_type, 'count', mb.count)) as top_materials
FROM supplier_stats ss
CROSS JOIN recent_performance rp
LEFT JOIN material_breakdown mb ON true
GROUP BY 
  ss.total_responded,
  ss.total_awarded,
  ss.avg_response_hours,
  ss.avg_distance_miles,
  rp.recent_responses,
  rp.recent_awarded;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "total_responded": 45,
  "total_awarded": 12,
  "win_rate_percent": 26.67,
  "avg_response_hours": 12.5,
  "avg_distance_miles": 32.5,
  "recent_responses": 8,
  "recent_awarded": 3,
  "recent_win_rate_percent": 37.50,
  "top_materials": [
    { "material_type": "Concrete", "count": 18 },
    { "material_type": "Steel", "count": 15 },
    { "material_type": "Glass", "count": 8 }
  ]
}
```

---

## Query 9: Response Quality Score

Calculate a quality score based on response time, distance, and win rate.

```sql
-- Response Quality Score
WITH metrics AS (
  SELECT 
    AVG(EXTRACT(EPOCH FROM (rr.created_at - r.created_at)) / 3600) as avg_response_hours,
    AVG(rsm.distance_miles) as avg_distance_miles,
    COUNT(CASE WHEN r.status = 'awarded' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as win_rate_percent
  FROM rfq_responses rr
  JOIN rfqs r ON rr.rfq_id = r.id
  LEFT JOIN rfq_supplier_matches rsm ON rr.rfq_id = rsm.rfq_id AND rr.supplier_id = rsm.supplier_id
  WHERE rr.supplier_id = $1
)
SELECT 
  avg_response_hours,
  avg_distance_miles,
  win_rate_percent,
  -- Quality score (0-100): Lower response time = higher score, Lower distance = higher score, Higher win rate = higher score
  ROUND(
    (
      (CASE WHEN avg_response_hours <= 12 THEN 100 ELSE GREATEST(0, 100 - (avg_response_hours - 12) * 5) END) * 0.3 +
      (CASE WHEN avg_distance_miles <= 25 THEN 100 ELSE GREATEST(0, 100 - (avg_distance_miles - 25) * 2) END) * 0.2 +
      win_rate_percent * 0.5
    ),
    1
  ) as quality_score
FROM metrics;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
{
  "avg_response_hours": 12.5,
  "avg_distance_miles": 32.5,
  "win_rate_percent": 26.67,
  "quality_score": 56.3
}
```

---

## Query 10: Opportunities Missed

Find RFQs the supplier was matched to but didn't respond to.

```sql
-- Opportunities Missed
SELECT 
  r.id,
  r.project_name,
  r.material_type,
  r.created_at,
  r.deadline,
  rsm.distance_miles,
  r.status,
  EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400 as days_since_created
FROM rfqs r
JOIN rfq_supplier_matches rsm ON r.id = rsm.rfq_id
WHERE rsm.supplier_id = $1
  AND r.status = 'open'
  AND NOT EXISTS (
    SELECT 1 FROM rfq_responses rr 
    WHERE rr.rfq_id = r.id AND rr.supplier_id = $1
  )
ORDER BY r.created_at DESC
LIMIT 20;
```

**Parameters:**
- `$1` - Supplier UserID

**Returns:**
```json
[
  {
    "id": 123,
    "project_name": "Office Building Renovation",
    "material_type": "Concrete",
    "created_at": "2025-01-08T10:00:00Z",
    "deadline": "2025-02-15T00:00:00Z",
    "distance_miles": 18.5,
    "status": "open",
    "days_since_created": 0.5
  }
]
```

---

## Usage Examples

### Node.js / Express

```javascript
const { pool } = require('../db');

async function getSupplierDashboard(supplierId) {
  const result = await pool.query(`
    -- Use Query 8: Comprehensive Dashboard Summary
    SELECT ...
  `, [supplierId]);
  
  return result.rows[0];
}
```

### API Endpoint

```javascript
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.user.userId;
    const summary = await getSupplierDashboard(supplierId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});
```

---

## Performance Optimization

### Indexes Required

```sql
-- Ensure these indexes exist for optimal performance
CREATE INDEX IF NOT EXISTS idx_rfq_responses_supplier ON rfq_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_created ON rfq_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfq_supplier_matches_supplier ON rfq_supplier_matches(supplier_id);
```

### Caching Recommendations

- Cache dashboard summary for 5 minutes
- Cache monthly trends for 1 hour
- Use materialized views for complex aggregations

---

**Last Updated:** January 8, 2025
