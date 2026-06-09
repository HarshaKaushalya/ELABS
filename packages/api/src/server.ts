import http from "node:http";
import { app } from "./app";
import { env } from "./config/env";

const server = http.createServer(app);

server.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
});