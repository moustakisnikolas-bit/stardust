import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Side-effect module: must be the first `import` in any entrypoint so it runs
// before other modules (e.g. config/env.ts) read process.env. ESM hoists all
// import statements above a module's own top-level code, so textual position
// alone does not guarantee ordering relative to other imported modules.
const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
