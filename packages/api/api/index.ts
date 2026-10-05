let appInstance: any = null;
let loadError: any = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (loadError) throw loadError;
  try {
    const mod: any = await import("../src/app");
    appInstance = mod.app || mod.default;
    return appInstance;
  } catch (err) {
    loadError = err;
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Invocation Error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "SERVERLESS_INITIALIZATION_ERROR",
        message: err?.message || String(err),
        stack: err?.stack,
        name: err?.name,
      })
    );
  }
}

module.exports = handler;
module.exports.default = handler;

