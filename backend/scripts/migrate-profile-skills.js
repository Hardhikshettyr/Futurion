require("dotenv").config();

const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/config/database");
const { migrateAllLegacySkills } = require("../src/services/legacySkillMigrationService");

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  await connectToDatabase();
  const report = await migrateAllLegacySkills({ dryRun });
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(`Skill migration failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
