import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  client: text("client").notNull(),
  location: text("location"),
  salaryRange: text("salary_range"),
  description: text("description"),
  requirements: text("requirements"),
  status: text("status", {
    enum: ["open", "in_review", "offer_sent", "filled", "closed"],
  })
    .notNull()
    .default("open"),
  postedJobMaster: integer("posted_job_master", { mode: "boolean" }).default(
    false
  ),
  postedLinkedin: integer("posted_linkedin", { mode: "boolean" }).default(
    false
  ),
  linkedinPostUrl: text("linkedin_post_url"),
  jobMasterPostedAt: text("job_master_posted_at"),
  linkedinPostedAt: text("linkedin_posted_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const candidates = sqliteTable("candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  currentTitle: text("current_title"),
  yearsExperience: integer("years_experience"),
  skills: text("skills"), // JSON array
  industries: text("industries"), // JSON array
  location: text("location"),
  summary: text("summary"), // AI-generated 3-line summary
  cvPath: text("cv_path"), // local file path
  source: text("source", { enum: ["jobmaster", "linkedin", "manual"] })
    .notNull()
    .default("manual"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const candidateMatches = sqliteTable("candidate_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  positionId: integer("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  strength: text("strength", { enum: ["strong", "possible", "weak"] }).notNull(),
  explanation: text("explanation"),
  // Status set by Jacob
  clientRequested: integer("client_requested", { mode: "boolean" }).default(false),
  hired: integer("hired", { mode: "boolean" }).default(false),
  rejected: integer("rejected", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const linkedinPosts = sqliteTable("linkedin_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["job", "holiday", "pr"] }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  positionId: integer("position_id").references(() => positions.id),
  linkedinUrl: text("linkedin_url"),
  postedAt: text("posted_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
