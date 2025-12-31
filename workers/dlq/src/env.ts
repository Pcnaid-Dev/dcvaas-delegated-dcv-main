/// <reference types="@cloudflare/workers-types" />
import { D1Database, Queue } from "@cloudflare/workers-types";

export type Env = {
  DB: D1Database;
  QUEUE: Queue;
};
