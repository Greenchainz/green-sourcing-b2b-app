// server/routers/catalog-router.ts
publicSearch: publicProcedure
  .input(
    z.object({
      query: z.string().optional(),
      category: z.string().optional(),
      minGwp: z.number().optional(),
      maxGwp: z.number().optional(),
      hasEpd: z.boolean().optional(),
      sortBy: z.enum(['relevance', 'gwp', 'price', 'name', 'createdAt']).optional(),
      page: z.number().int().min(1).default(1),
    })
  )
  .query(async ({ input }) => {
    const conditions = [eq(schema.materials.verified, true)];

    if (input.query) {
      conditions.push(
        sql`to_tsvector('english', ${schema.materials.name} || ' ' || COALESCE(${schema.materials.productName}, '') || ' ' || COALESCE(${schema.materials.description}, '')) @@ plainto_tsquery('english', ${input.query})`
      );
    }
    if (input.category) {
      conditions.push(eq(schema.materials.category, input.category));
    }
    if (input.hasEpd) {
      conditions.push(eq(schema.materials.hasEpd, true));
    }
    if (input.minGwp !== undefined) {
      conditions.push(sql`${schema.materials.gwpValue} >= ${input.minGwp}`);
    }
    if (input.maxGwp !== undefined) {
      conditions.push(sql`${schema.materials.gwpValue} <= ${input.maxGwp}`);
    }

    const where = and(...conditions);

    // Count
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.materials)
      .where(where);
    const totalCount = countRow?.count ?? 0;

    // Sort
    const sort = input.sortBy ?? 'createdAt';
    const orderBy =
      sort === 'gwp'   ? schema.materials.gwpValue :
      sort === 'price' ? schema.materials.pricePerUnit :
      sort === 'name'  ? schema.materials.name :
                         desc(schema.materials.createdAt);

    // Page
    const offset = (input.page - 1) * CATALOG_PER_PAGE;

    const items = await db
      .select({
        id:               schema.materials.id,
        name:             schema.materials.name,
        productName:      schema.materials.productName,
        description:      schema.materials.description,
        category:         schema.materials.category,
        subcategory:      schema.materials.subcategory,
        gwpValue:         schema.materials.gwpValue,
        gwpUnit:          schema.materials.gwpUnit,
        pricePerUnit:     schema.materials.pricePerUnit,
        priceUnit:        schema.materials.priceUnit,
        hasEpd:           schema.materials.hasEpd,
        epdNumber:        schema.materials.epdNumber,
        imageUrl:         schema.materials.imageUrl,
        verified:         schema.materials.verified,
        createdAt:        schema.materials.createdAt,
        manufacturerId:   schema.manufacturers.id,
        manufacturerName: schema.manufacturers.name,
        manufacturerLogo: schema.manufacturers.logoUrl,
      })
      .from(schema.materials)
      .leftJoin(
        schema.manufacturers,
        eq(schema.materials.manufacturerId, schema.manufacturers.id)
      )
      .where(where)
      .orderBy(orderBy)
      .limit(CATALOG_PER_PAGE)
      .offset(offset);

    return {
      items,
      totalCount,
      totalPages: Math.ceil(totalCount / CATALOG_PER_PAGE),
    };
  }),
