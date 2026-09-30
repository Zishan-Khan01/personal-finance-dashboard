import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  createAccessToken,
  hashPassword,
  verifyPassword
} from "../lib/auth.js";

import { isValidEmail } from "../lib/validation.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    !isValidEmail(email) ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res.status(400).json({
      error:
        "Name, a valid email, and a password of at least 8 characters are required"
    });
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password)
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  res.status(201).json({
    user,
    accessToken: createAccessToken(user.id)
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || typeof password !== "string") {
    return res.status(400).json({
      error: "A valid email and password are required"
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase()
    }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({
      error: "Invalid email or password"
    });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    accessToken: createAccessToken(user.id)
  });
});

export default router;