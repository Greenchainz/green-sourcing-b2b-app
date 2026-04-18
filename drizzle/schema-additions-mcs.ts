/**
 * Drizzle schema additions for the Material Credit Score (MCS) / Architect Spec features.
 * Mirrors tables in drizzle/0031_mcs_tables.sql.
 */
import { pgTable, serial, text, integer, timestamp, decimal, json, varchar } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";

export const architectUploadedSpecs = pgTable("architect_uploaded_specs", {
  id:               serial("id").primaryKey(),
  architectId:      integer("architect_id").notNull(),
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  blobUrl:          text("blob_url").notNull(),
  mimeType:         varchar("mime_type", { length: 100 }),
  fileSizeBytes:    integer("file_size_bytes"),
  parseStatus:      text("parse_status").default("pending"),
  parseStartedAt:   timestamp("parse_started_at"),
  parseCompletedAt: timestamp("parse_completed_at"),
  totalPages:       integer("total_pages"),
  totalAssemblies:  integer("total_assemblies").default(0),
  rawExtraction:    json("raw_extraction"),
  errorMessage:     text("error_message"),
  projectName:      varchar("project_name", { length: 255 }),
  projectLocation:  varchar("project_location", { length: 255 }),
  estimatedValue:   decimal("estimated_value", { precision: 14, scale: 2 }),
  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow(),
});
export type InsertArchitectUploadedSpec = InferInsertModel<typeof architectUploadedSpecs>;

export const architectSpecAssemblies = pgTable("architect_spec_assemblies", {
  id:                   serial("id").primaryKey(),
  specId:               integer("spec_id").notNull(),
  assemblyCode:         varchar("assembly_code", { length: 20 }),
  assemblyType:         varchar("assembly_type", { length: 120 }),
  structuralOption:     integer("structural_option"),
  declaredUnit:         varchar("declared_unit", { length: 100 }),
  gwpValue:             decimal("gwp_value", { precision: 14, scale: 4 }),
  gwpUnit:              varchar("gwp_unit", { length: 50 }),
  gwpPer1000sf:         decimal("gwp_per_1000sf", { precision: 14, scale: 4 }),
  manufacturerHint:     varchar("manufacturer_hint", { length: 255 }),
  productHint:          varchar("product_hint", { length: 255 }),
  pageNumber:           integer("page_number"),
  lineNumber:           integer("line_number"),
  rawRow:               json("raw_row"),
  matchedEpdMaterialId: integer("matched_epd_material_id"),
  matchConfidence:      decimal("match_confidence", { precision: 4, scale: 3 }),
  assemblyName:         text("assembly_name"),
  gwp:                  decimal("gwp", { precision: 14, scale: 4 }),
  quantity:             text("quantity"),
  description:          text("description"),
  createdAt:            timestamp("created_at").defaultNow(),
});

export type InsertArchitectSpecAssembly = InferInsertModel<typeof architectSpecAssemblies>;
