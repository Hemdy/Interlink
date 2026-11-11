import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { USER_ROLES, type UserRole } from "@interlink/types";
import { getDb } from "./connection";
import { industries, roles, skills } from "./schema";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, "../../..");
for (const envFile of [".env.local", ".env"]) {
  const fullPath = resolve(rootDir, envFile);
  if (existsSync(fullPath)) {
    config({ path: fullPath });
  }
}

const roleLabels: Record<UserRole, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  admin: "Administrator",
  super_admin: "Super administrator",
  community_manager: "Community manager",
  programme_coordinator: "Programme coordinator",
};

const defaultIndustries = [
  {
    name: "Technology & Software",
    description: "Software engineering, cloud infrastructure, cybersecurity, and AI.",
  },
  {
    name: "Product & Design",
    description: "Product management, UX/UI design, user research, and design systems.",
  },
  {
    name: "Business & Entrepreneurship",
    description: "Startups, business strategy, operations, and venture building.",
  },
  {
    name: "Finance & Accounting",
    description: "Corporate finance, fintech, investment, auditing, and financial planning.",
  },
  {
    name: "Marketing & Growth",
    description: "Brand strategy, digital marketing, growth, sales, and communications.",
  },
  {
    name: "Data & Analytics",
    description: "Data science, business intelligence, data engineering, and analytics.",
  },
  {
    name: "Law & Governance",
    description: "Corporate law, regulatory compliance, policy, and legal advisory.",
  },
  {
    name: "Healthcare & Life Sciences",
    description: "Clinical practice, public health, biotech, and health operations.",
  },
  {
    name: "Education & Research",
    description: "Academic leadership, curriculum design, and career readiness.",
  },
  {
    name: "Creative & Media",
    description: "Content production, publishing, journalism, and creative direction.",
  },
];

const defaultSkills = [
  "Frontend Development",
  "Backend Engineering",
  "System Architecture",
  "Product Strategy",
  "UX Research & Design",
  "Data Analysis",
  "Career Transition",
  "CV & Portfolio Review",
  "Technical Interview Prep",
  "Startup Fundraising",
  "Business Operations",
  "Leadership & Management",
  "Financial Modelling",
  "Growth Marketing",
  "Public Speaking",
  "Project Management",
];

async function seedCatalogue() {
  const db = getDb();

  await db
    .insert(roles)
    .values(USER_ROLES.map((key) => ({ key, label: roleLabels[key] })))
    .onConflictDoNothing();

  await db.insert(industries).values(defaultIndustries).onConflictDoNothing();

  await db
    .insert(skills)
    .values(defaultSkills.map((name) => ({ name })))
    .onConflictDoNothing();
}

void seedCatalogue().catch((error: unknown) => {
  console.error("Failed to seed the Interlink catalogue.", error);
  process.exitCode = 1;
});
