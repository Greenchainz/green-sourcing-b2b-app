## Azure Postgres RFQ Simulator (enterprise ops notes)

### Apply schema

From the backend folder (or anywhere with `DATABASE_URL` set):

```bash
npm --prefix backend run db:apply:rfq-simulator
```

Or directly with psql:

```bash
psql "$DATABASE_URL" -f database-schemas/azure_postgres_rfq_simulator.sql
```

### Seed demo RFQ + generate distribution waves

```bash
npm --prefix backend run seed:rfq-simulator
```

This:
- Inserts a few suppliers/products/rfqs (UUID schema)
- Calls the RFQ distributor to populate `"RFQ_Distribution_Queue"`

### Wave queue worker (how to “send notifications” safely)

To atomically claim due queue entries (safe for multiple workers):

```sql
SELECT * FROM gc_claim_due_notifications(100);
```

It:
- Finds `status = 'pending'` entries where `visible_at <= now()` and not expired
- Locks them with `FOR UPDATE SKIP LOCKED`
- Marks them `status='notified'` and sets `notified_at=now()`
- Returns the claimed `(rfq_id, supplier_id, wave_number, visible_at, expires_at)`

To expire old entries:

```sql
SELECT gc_expire_queue_entries();
```

### Supplier inbox query

```sql
SELECT * FROM rfq_supplier_inbox WHERE supplier_id = '<uuid>';
```

