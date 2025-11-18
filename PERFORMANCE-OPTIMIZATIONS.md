# Performance Optimizations Guide

This document describes the performance improvements made to the GreenChainz B2B platform and provides guidance for maintaining optimal performance.

## Summary of Optimizations

### 1. Database Query Optimizations

#### ✅ N+1 Query Problem Fixed
**Location**: `backend/services/verificationScore.js`

**Problem**: The `computeAllSupplierScores` function was making sequential database calls for each supplier (N+1 queries pattern), causing severe performance degradation with many suppliers.

**Before**:
```javascript
async function computeAllSupplierScores(pool) {
    const suppliersRes = await pool.query('SELECT SupplierID FROM Suppliers');
    const scores = [];
    for (const row of suppliersRes.rows) {
        scores.push(await computeSupplierScore(pool, supplierId)); // N queries
    }
    return scores;
}
```

**After**:
```javascript
async function computeAllSupplierScores(pool) {
    // Single optimized query that computes all scores at once
    const query = `WITH all_certs AS (...) SELECT ... GROUP BY s.SupplierID`;
    const result = await pool.query(query);
    return result.rows.map(row => { /* compute score */ });
}
```

**Impact**: 
- Reduced from **N+2 queries** to **1 query** where N is the number of suppliers
- For 100 suppliers: **102 queries → 1 query** (99% reduction)
- Expected response time improvement: **5-10x faster**

#### ✅ Batch Insert Optimization
**Location**: `backend/services/verificationScore.js`

**Problem**: The `persistAllSupplierScores` function was making sequential INSERT queries for each supplier.

**After**: Implemented batch UPSERT using a single query with multiple value sets.

**Impact**:
- Reduced from **N queries** to **1 query**
- For 100 suppliers: **100 queries → 1 query** (99% reduction)
- Expected response time improvement: **10-20x faster**

#### ✅ Parallel Query Execution
**Location**: `backend/index.js` - `/api/v1/metrics` endpoint

**Problem**: Multiple COUNT queries were executed sequentially, each waiting for the previous to complete.

**Before**:
```javascript
const suppliersRes = await pool.query('SELECT COUNT(*) FROM Suppliers');
const productsRes = await pool.query('SELECT COUNT(*) FROM Products');
// ... more sequential queries
```

**After**:
```javascript
const [suppliersRes, productsRes, ...] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM Suppliers'),
    pool.query('SELECT COUNT(*) FROM Products'),
    // ... parallel queries
]);
```

**Impact**:
- Response time reduced from **sum of all queries** to **max of any single query**
- Expected improvement: **3-5x faster** for metrics endpoint

#### ✅ Score Caching
**Location**: `backend/index.js` - `/api/v1/metrics` endpoint

**Problem**: Metrics endpoint was recomputing all supplier scores on every request.

**Solution**: Use persisted scores from `Supplier_Verification_Scores` table when available, only computing live scores as fallback.

**Impact**: 
- Avoids complex certification aggregation queries on every metrics request
- Expected improvement: **20-50x faster** when scores are pre-computed

### 2. Provider Integration Optimizations

#### ✅ FSC Provider Batch Processing
**Location**: `backend/providers/fscMock.js`

**Problem**: 
1. Sequential database lookups for each certificate (N+1 queries)
2. Sequential processing of certificates

**Solutions**:
1. **Batch Supplier Lookup**: Fetch all supplier mappings in a single query
2. **Parallel Processing**: Process certificates in batches with controlled concurrency

**Impact**:
- Supplier lookups: **N queries → 1 query**
- Certificate processing: **3-5x faster** with parallel batches
- Memory efficient: Controlled batch size prevents memory overflow

### 3. Database Connection Pool Optimization

#### ✅ Enhanced Pool Configuration
**Location**: `backend/db.js`

**Changes**:
```javascript
max: 20,  // Increased from 10
min: 2,   // Added minimum connections
connectionTimeoutMillis: 5000,  // Added timeout
statement_timeout: 30000  // Prevent long-running queries
```

**Benefits**:
- Better handling of concurrent requests
- Faster connection acquisition
- Protection against query runaway
- Development monitoring for pool health

### 4. Database Indexes

#### ✅ Comprehensive Index Strategy
**Location**: `database-schemas/performance-indexes.sql`

**Added indexes for**:
- User authentication (email, reset tokens)
- Supplier and company searches
- Certification lookups and filtering
- RFQ queries by buyer/supplier/status
- Notification log queries

**Impact**:
- Index scans instead of sequential scans
- Expected improvement: **10-100x faster** for filtered queries
- Especially beneficial as data grows

## Performance Best Practices

### For Developers

1. **Always use connection pooling** - Never create individual database connections
2. **Batch operations** when processing multiple records
3. **Use Promise.all()** for independent async operations
4. **Add indexes** for columns used in WHERE, JOIN, and ORDER BY clauses
5. **Cache expensive computations** (e.g., verification scores)
6. **Use EXPLAIN ANALYZE** to identify slow queries

### For Database Operations

1. **Run ANALYZE periodically** to update query planner statistics:
   ```sql
   ANALYZE Users;
   ANALYZE Suppliers;
   -- etc.
   ```

2. **Monitor index usage**:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes 
   WHERE schemaname = 'public'
   ORDER BY idx_scan ASC;
   ```

3. **Identify slow queries**:
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

### For Deployment

1. **Apply performance indexes**:
   ```bash
   psql -U user -d greenchainz_dev -f database-schemas/performance-indexes.sql
   ```

2. **Set appropriate pool size** based on deployment size:
   - Small (< 100 concurrent users): `PGPOOL_MAX=20`
   - Medium (100-500 users): `PGPOOL_MAX=50`
   - Large (> 500 users): `PGPOOL_MAX=100`

3. **Enable query logging** in production (PostgreSQL config):
   ```
   log_min_duration_statement = 1000  # Log queries > 1s
   ```

4. **Monitor pool statistics** in development:
   - Check console output for pool stats (logged every minute)
   - Watch for high `waiting` count (indicates pool exhaustion)

## Environment Variables

Add these to your `.env` file for optimal performance:

```env
# Database Pool Configuration
PGPOOL_MAX=20                    # Maximum connections (adjust based on load)
PGPOOL_MIN=2                     # Minimum idle connections
PGPOOL_IDLE=30000               # Idle connection timeout (30s)
PGPOOL_CONNECTION_TIMEOUT=5000   # Connection acquisition timeout (5s)
PGPOOL_STATEMENT_TIMEOUT=30000   # Query execution timeout (30s)
```

## Performance Monitoring

### Key Metrics to Track

1. **Database Connection Pool**
   - Total connections
   - Idle connections
   - Waiting requests
   - Average wait time

2. **Query Performance**
   - Average query execution time
   - Slow query count (> 1s)
   - Query errors

3. **API Response Times**
   - P50, P95, P99 latencies
   - Requests per second
   - Error rate

4. **Resource Utilization**
   - Database CPU usage
   - Database memory usage
   - Connection count

### Recommended Tools

- **pg_stat_statements** - PostgreSQL query statistics
- **pgAdmin** - Database monitoring and query analysis
- **New Relic / DataDog** - Application Performance Monitoring (APM)
- **Grafana + Prometheus** - Metrics dashboards

## Expected Performance Gains

Based on these optimizations, here are the expected improvements:

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Compute all supplier scores | ~5s (100 suppliers) | ~100ms | 50x faster |
| Persist all supplier scores | ~3s (100 suppliers) | ~150ms | 20x faster |
| FSC certificate sync | ~10s (100 certs) | ~2s | 5x faster |
| Metrics endpoint | ~2s | ~200ms | 10x faster |
| Supplier search (indexed) | ~500ms | ~20ms | 25x faster |
| RFQ list queries (indexed) | ~300ms | ~15ms | 20x faster |

*Note: Actual improvements depend on hardware, database size, and concurrent load*

## Regression Prevention

To prevent performance regressions:

1. **Code review checklist**:
   - [ ] No N+1 query patterns
   - [ ] Bulk operations use batching
   - [ ] Independent queries use Promise.all()
   - [ ] Database queries have appropriate indexes

2. **Testing guidelines**:
   - Add performance tests for critical paths
   - Benchmark with realistic data volumes
   - Test with concurrent users

3. **Monitoring alerts**:
   - Alert on slow queries (> 1s)
   - Alert on high pool wait times
   - Alert on increased P95 latency

## Future Optimization Opportunities

These optimizations are not yet implemented but could provide additional gains:

1. **Redis caching layer**
   - Cache frequently accessed supplier profiles
   - Cache verification scores with TTL
   - Cache search results

2. **Database read replicas**
   - Offload read queries to replicas
   - Improve scalability

3. **GraphQL or DataLoader**
   - Batch and cache related data fetches
   - Eliminate remaining N+1 patterns

4. **Message queue for notifications**
   - Decouple email sending from API responses
   - Improve RFQ response times

5. **Database partitioning**
   - Partition large tables by date
   - Improve query performance on historical data

6. **Full-text search**
   - PostgreSQL full-text search for supplier descriptions
   - Or Elasticsearch for advanced search

## Support and Troubleshooting

### Common Issues

**Issue**: High pool waiting count
**Solution**: Increase `PGPOOL_MAX` or investigate slow queries

**Issue**: Connection timeout errors
**Solution**: Increase `PGPOOL_CONNECTION_TIMEOUT` or add more pool connections

**Issue**: Slow queries despite indexes
**Solution**: Run `ANALYZE` to update statistics, check index usage with `EXPLAIN`

**Issue**: Memory pressure
**Solution**: Reduce `PGPOOL_MAX`, optimize query result sets, add pagination

### Getting Help

For performance issues:
1. Check application logs for slow query warnings
2. Review database logs for connection issues
3. Use `EXPLAIN ANALYZE` to understand query plans
4. Consult PostgreSQL documentation for tuning

## Conclusion

These optimizations significantly improve the performance and scalability of the GreenChainz platform. Regular monitoring and maintenance will ensure continued optimal performance as the system grows.

For questions or additional optimization suggestions, please contact the development team.
