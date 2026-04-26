import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const sqlite = new Database(path.join(process.cwd(), "focus.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function seed() {
  await db.insert(schema.positions).values([
    {
      title: "Senior Full-Stack Developer",
      client: "Taboola",
      location: "Tel Aviv",
      salaryRange: "₪35,000–45,000",
      description: "Join Taboola's core platform team building high-scale ad delivery systems. You'll work across the full stack on features used by millions of users daily.",
      requirements: "• 5+ years full-stack experience\n• Strong Node.js and React skills\n• Experience with high-scale distributed systems\n• Fluent English",
      status: "open",
    },
    {
      title: "Product Manager — Growth",
      client: "Monday.com",
      location: "Tel Aviv",
      salaryRange: "₪40,000–55,000",
      description: "Lead the growth squad at Monday.com, owning activation, retention, and expansion metrics. Work closely with engineering, design, and data.",
      requirements: "• 4+ years PM experience, ideally in SaaS\n• Strong analytical mindset\n• Experience running A/B experiments\n• Excellent communication skills",
      status: "open",
    },
    {
      title: "DevOps Engineer",
      client: "Wix",
      location: "Tel Aviv",
      salaryRange: "₪28,000–38,000",
      description: "Own Wix's CI/CD infrastructure and cloud cost optimisation. You'll work with Kubernetes, Terraform, and AWS at serious scale.",
      requirements: "• 3+ years DevOps experience\n• Kubernetes and Terraform proficiency\n• AWS or GCP experience\n• Scripting in Python or Bash",
      status: "open",
    },
    {
      title: "UX Designer",
      client: "Fiverr",
      location: "Tel Aviv",
      salaryRange: "₪22,000–30,000",
      description: "Design intuitive buyer and seller experiences for Fiverr's marketplace. Own end-to-end design from research to production.",
      requirements: "• 3+ years UX design experience\n• Strong Figma skills\n• Portfolio with marketplace or e-commerce work\n• User research experience",
      status: "open",
    },
    {
      title: "Data Scientist",
      client: "Check Point",
      location: "Tel Aviv",
      salaryRange: "₪32,000–42,000",
      description: "Build ML models to detect cybersecurity threats in real time. Work with petabytes of network data and state-of-the-art infrastructure.",
      requirements: "• MSc or PhD in CS, Statistics or related field\n• Python, PyTorch or TensorFlow\n• Experience with anomaly detection\n• Publications a plus",
      status: "open",
    },
    {
      title: "Frontend Engineer",
      client: "Lightricks",
      location: "Jerusalem",
      salaryRange: "₪25,000–35,000",
      description: "Build beautiful, performant web experiences for Lightricks' creative tools. You'll work on consumer-facing products used by millions of creators.",
      requirements: "• 3+ years frontend experience\n• Deep React knowledge\n• Eye for design and attention to detail\n• Experience with animations a plus",
      status: "filled",
    },
    {
      title: "VP Engineering",
      client: "Papaya Global",
      location: "Tel Aviv",
      salaryRange: "₪70,000–90,000",
      description: "Lead Papaya's 80-person engineering organisation through its next phase of growth. Own technical strategy, hiring, and culture.",
      requirements: "• 10+ years engineering leadership\n• Experience scaling teams to 50+\n• Strong technical background\n• Native-level English",
      status: "cancelled",
    },
    {
      title: "Backend Engineer — Payments",
      client: "Melio",
      location: "Tel Aviv",
      salaryRange: "₪30,000–42,000",
      description: "Build and scale Melio's payment processing infrastructure. Own critical financial flows for thousands of SMBs.",
      requirements: "• 4+ years backend experience\n• Experience with payment systems or fintech\n• Node.js or Go\n• Strong understanding of system reliability",
      status: "open",
    },
  ]);

  console.log("✅ Seeded 8 positions");
  sqlite.close();
}

seed();
