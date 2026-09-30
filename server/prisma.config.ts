import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    // This migrates your exact seed command
    seed: "node prisma/seed.js", 
  },
});
