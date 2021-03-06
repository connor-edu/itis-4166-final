import { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";
import jwt from "jsonwebtoken";

const db = new Pool({
  host: "db.dotconnor.com",
  user: "itis4166final",
  password: process.env.DATABASE_PASSWORD,
  idleTimeoutMillis: 250,
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Get the token from the authorization header and strip the Bearer prefix.
  const token = req.headers.authorization?.replace("Bearer ", "");
  // Sanity check if token is not present.
  if (!token) {
    return res.status(401).json({
      error: "You must be logged in.",
    });
  }

  // Try to validate the token using our secret, and storing the user metadata.
  let user: { uid: number };
  try {
    user = jwt.verify(token, process.env.DATABASE_PASSWORD) as any;
  } catch (_e) {
    return res.status(401).json({
      error: "You must be logged in.",
    });
  }

  if (req.method === "POST") {
    // If the request is a POST, we are trying to add an entry to the users budget,
    // in that case valid all of the inputs,
    // and then insert the data into the database.
    const { name, amount } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({
        error: "Invalid name",
      });
    }

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    await db.query("insert into budget (account, name, amount) values ($1, $2, $3)", [user.uid, name, amount]);
  } else if (req.method === "DELETE") {
    // If the request is a DELETE, we want to remove one or more entries, so we check for the entries field,
    // and verify that every item in the array is a number.
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries) || !entries.every((a) => typeof a === "number")) {
      return res.status(400).json({
        error: "Invalid entries",
      });
    }

    await db.query("delete from budget where id = any($1) and account = $2", [entries, user.uid]);
  }

  const { rows } = await db.query("select id, name, amount from budget where account = $1", [user.uid]);

  return res.json(rows.map((a) => ({ ...a, amount: Number(a.amount) })));
};
