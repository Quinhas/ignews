import { Client } from "faunadb";

export const fauna = new Client({
  secret: String(process.env.FAUNADB_KEY),
  domain: "db.us.fauna.com",
  scheme: "https",
});
