import http from "node:http";
import { app } from "./app";
import { env } from "./config/env";
import { attachSocket } from "./realtime/socket";
import { runNotificationsJob } from "./jobs/notifications.job";

const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
attachSocket(server);

server.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  console.log(`Socket.IO attached on same port`);

  // Run automated overdue & return reminder job on boot and every 10 minutes
  runNotificationsJob().catch(console.error);
  setInterval(() => {
    runNotificationsJob().catch(console.error);
  }, 10 * 60 * 1000);
});