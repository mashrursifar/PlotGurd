import { runCli } from "./database-cli.js";
import { seedDatabase } from "./seed-database.js";

await runCli("Demo reset", seedDatabase);
