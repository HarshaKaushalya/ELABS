import http from "node:http";
import { app } from "./app";
import { env } from "./config/env";

const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});