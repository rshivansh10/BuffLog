import { app, ensureSchemaInitialized } from "../server/index.js";

export default async function handler(req, res) {
  await ensureSchemaInitialized();
  return app(req, res);
}
