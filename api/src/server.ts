import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { openDatabase } from "./database.js";
import { pruneUploads } from "./uploads.js";

const config = readConfig();
const db = openDatabase(config.dataDir);
// Images uploaded to a form that was never saved.
pruneUploads(db, config.dataDir, 24 * 60 * 60 * 1000);
const server = createApp(db, config).listen(config.port, "127.0.0.1", () => {
  console.log(`GDG API listening on http://127.0.0.1:${config.port}`);
});
server.on("error", (error) => { console.error(error.message); db.close(); process.exitCode = 1; });
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => { db.close(); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
