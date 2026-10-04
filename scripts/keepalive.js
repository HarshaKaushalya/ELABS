// Keeps the local tunnel socket hot to prevent idle disconnects
const URL = "https://pts-asp-motels-addressed.trycloudflare.com/health";
const LOCAL_URL = "http://localhost:3000/login";

console.log("[KeepAlive] Started heartbeat daemon every 25 seconds...");

setInterval(async () => {
  try {
    const res = await fetch(LOCAL_URL, { signal: AbortSignal.timeout(5000) });
  } catch (err) {}
}, 25000);
