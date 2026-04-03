import { app, initializeRuntime } from "../backend/app.js";

let runtimeReady;

export default async function handler(req, res) {
  if (!runtimeReady) {
    runtimeReady = initializeRuntime();
  }

  await runtimeReady;
  return app(req, res);
}
