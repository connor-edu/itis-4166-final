import { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";
import argon from "argon2";
import jwt from "jsonwebtoken";

const db = new Pool({
  host: "db.dotconnor.com",
  user: "itis4166final",
  password: process.env.DATABASE_PASSWORD,
  idleTimeoutMillis: 250,
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.body.username || typeof req.body.username !== "string") {
    return res.status(400).json({
      message: "Username required.",
      field: "username",
    });
  }

  if (!req.body.password || typeof req.body.password !== "string") {
    return res.status(400).json({
      message: "Password required.",
      field: "password",
    });
  }

  const { rows } = await db.query<{ id: number; username: string; password: string }>(
    "select * from users where username = $1",
    [req.body.username]
  );
  if (rows.length === 0) {
    return res.status(400).json({
      message: "Account not found.",
      field: "username",
    });
  }

  const [account] = rows;

  if (await argon.verify(account.password, req.body.password)) {
    const token = jwt.sign(
      {
        uid: account.id,
        username: account.username,
      },
      process.env.DATABASE_PASSWORD
    );
    return res.json({ token });
  }

  return res.status(400).json({
    message: "Incorrect password.",
    field: "password",
  });
};
