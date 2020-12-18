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

  if (req.body.username.length < 3) {
    return res.status(400).json({
      message: "Username must be atleast 3 characters.",
      field: "username",
    });
  }

  if (!req.body.password || typeof req.body.password !== "string") {
    return res.status(400).json({
      message: "Password required.",
      field: "password",
    });
  }

  if (!req.body.confirm_password || typeof req.body.confirm_password !== "string") {
    return res.status(400).json({
      message: "Confirm password required.",
      field: "confirm_password",
    });
  }

  if (req.body.password !== req.body.confirm_password) {
    return res.status(400).json({
      message: "Passwords must match",
      field: "confirm_password",
    });
  }

  const { rows } = await db.query("select * from users where username = $1", [req.body.username]);
  if (rows.length > 0) {
    return res.status(400).json({
      message: "Username taken.",
      field: "username",
    });
  }

  const password_hash = await argon.hash(req.body.password);
  const {
    rows: [{ id }],
  } = await db.query<{ id: number }>("insert into users (username, password) values ($1, $2) returning *", [
    req.body.username,
    password_hash,
  ]);
  const token = jwt.sign(
    {
      uid: id,
      username: req.body.username,
    },
    process.env.DATABASE_PASSWORD
  );
  return res.json({ token });
};
