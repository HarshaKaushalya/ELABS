import http from "node:http";
import { app } from "./app";
import { env } from "./config/env";
import { attachSocket } from "./realtime/socket";

const server = http.createServer(app);

// Attach Socket.IO to the HTTP server (critical fix — was missing before)
attachSocket(server);

server.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  console.log(`Socket.IO attached on same port`);
});