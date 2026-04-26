import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const clients = sqliteTable("clients", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  name:        text("name").notNull(),
  tagline:     text("tagline"),
  industry:    text("industry"),
  website:     text("website"),
  linkedinUrl: text("linkedin_url"),
  logoPath:    text("logo_path"),
  createdAt:   text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const clientContacts = sqliteTable("client_contacts", {
  id:        integer("id").primaryKey({ autoIncrement: true }),
  clientId:  integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  title:     text("title"),
  email:     text("email"),
  phone:     text("phone"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  client: text("client").notNull(),
  location: text("location"),
  salaryRange: text("salary_range"),
  description: text("description"),
  requirements: text("requirements"),
  status: text("status", { enum: ["open", "filled", "cancelled"] })
    .notNull()
    .default("open"),
  postedJobMaster: integer("posted_job_master", { mode: "boolean" }).default(false),
  postedLinkedin:  integer("posted_linkedin",   { mode: "boolean" }).default(false),
  linkedinPostUrl: text("linkedin_post_url"),
  jobMasterUrl:      text("job_master_url"),
  jobMasterPostedAt: text("job_master_posted_at"),
  linkedinPostedAt:  text("linkedin_posted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const candidates = sqliteTable("candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName:        text("full_name").notNull(),
  email:           text("email"),
  phone:           text("phone"),
  currentTitle:    text("current_title"),
  yearsExperience: integer("years_experience"),
  skills:          text("skills"),     // JSON array
  industries:      text("industries"), // JSON array
  location:        text("location"),
  summary:         text("summary"),    // AI-generated summary (English)
  summaryHe:       text("summary_he"), // AI-generated summary (Hebrew)
  cvPath:          text("cv_path"),    // local file path
  source: text("source", { enum: ["jobmaster", "linkedin", "manual"] })
    .notNull()
    .default("manual"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const candidateMatches = sqliteTable("candidate_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  positionId: integer("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  // AI match quality
  strength: text("strength", { enum: ["strong", "possible", "weak"] }).notNull(),
  explanation:   text("explanation"),    // AI match explanation (English)
  explanationHe: text("explanation_he"), // AI match explanation (Hebrew)
  // Candidate pipeline status — set by Jacob
  candidateStatus: text("candidate_status", {
    enum: ["open", "client_review", "interview", "hired", "rejected", "relevant", "not_relevant"],
  }).notNull().default("open"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  candidatePosUnique: uniqueIndex("candidate_matches_candidate_position_unique").on(table.candidateId, table.positionId),
}));

// ── Relations ──
export const clientsRelations = relations(clients, ({ many }) => ({
  contacts:  many(clientContacts),
  positions: many(positions),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, { fields: [clientContacts.clientId], references: [clients.id] }),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  client:  one(clients, { fields: [positions.clientId], references: [clients.id] }),
  matches: many(candidateMatches),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  matches: many(candidateMatches),
}));

export const candidateMatchesRelations = relations(candidateMatches, ({ one }) => ({
  position:  one(positions,  { fields: [candidateMatches.positionId],  references: [positions.id]  }),
  candidate: one(candidates, { fields: [candidateMatches.candidateId], references: [candidates.id] }),
}));

export const linkedinPosts = sqliteTable("linkedin_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["job", "holiday", "pr"] }).notNull(),
  content:    text("content").notNull(),
  imageUrl:   text("image_url"),
  positionId: integer("position_id").references(() => positions.id),
  linkedinUrl: text("linkedin_url"),
  postedAt:   text("posted_at"),
  createdAt:  text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
