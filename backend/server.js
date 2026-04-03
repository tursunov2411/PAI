import { app, initializeRuntime, shutdownRuntime } from "./app.js";

const port = Number(process.env.PORT || 5000);

const shutdown = async () => {
  await shutdownRuntime();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen(port, async () => {
  console.log(`Backend listening on http://localhost:${port}`);
  await initializeRuntime();
});
