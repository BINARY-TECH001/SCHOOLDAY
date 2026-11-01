import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.fhztivnuvzjjdbzivqcx:bCn-4%24Avpr23%25%2C3@aws-0-eu-west-2.pooler.supabase.com:5432/postgres";

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Error]", err);
});
