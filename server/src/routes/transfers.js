import { Router } from "express";
import { prisma } from "../lib/prisma.js";

import {
  isPositiveMoney,
  isValidUUID,
  isValidDate
} from "../lib/validation.js";

const router = Router();

// GET all transfers
router.get("/", async (req, res) => {
  const transfers = await prisma.transfer.findMany({
    where: {
      userId: req.userId
    },
    include: {
      fromAccount: true,
      toAccount: true
    },
    orderBy: {
      transferDate: "desc"
    }
  });

  res.json(transfers);
});

// CREATE transfer
router.post("/", async (req, res) => {
  const {
    fromAccountId,
    toAccountId,
    amount,
    description,
    transferDate
  } = req.body ?? {};

  if (
    !fromAccountId ||
    !toAccountId ||
    amount === undefined ||
    amount === null ||
    !transferDate
  ) {
    return res.status(400).json({
      error:
        "fromAccountId, toAccountId, amount, and transferDate are required"
    });
  }

  if (
    !isValidUUID(fromAccountId) ||
    !isValidUUID(toAccountId)
  ) {
    return res.status(400).json({
      error:
        "fromAccountId and toAccountId must be valid UUIDs"
    });
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({
      error:
        "Source and destination accounts must be different"
    });
  }

  if (!isPositiveMoney(amount)) {
    return res.status(400).json({
      error:
        "amount must be a valid positive number with up to 4 decimal places"
    });
  }

  if (!isValidDate(transferDate)) {
    return res.status(400).json({
      error:
        "transferDate must be a valid ISO date"
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "description must be a string"
    });
  }

  const [fromAccount, toAccount] =
    await Promise.all([
      prisma.account.findFirst({
        where: {
          id: fromAccountId,
          userId: req.userId
        }
      }),

      prisma.account.findFirst({
        where: {
          id: toAccountId,
          userId: req.userId
        }
      })
    ]);

  if (!fromAccount || !toAccount) {
    return res.status(400).json({
      error:
        "Invalid source or destination account"
    });
  }

  if (
    !fromAccount.isActive ||
    !toAccount.isActive
  ) {
    return res.status(400).json({
      error:
        "Transfers require active source and destination accounts"
    });
  }

  if (
    fromAccount.currencyCode !==
    toAccount.currencyCode
  ) {
    return res.status(400).json({
      error:
        "Both accounts must use the same currency"
    });
  }

  const date = new Date(transferDate);

  const transfer =
    await prisma.transfer.create({
      data: {
        userId: req.userId,
        fromAccountId,
        toAccountId,
        amount: String(amount),
        currencyCode:
          fromAccount.currencyCode,
        description:
          description?.trim() || null,
        transferDate: date
      }
    });

  res.status(201).json(transfer);
});

// UPDATE transfer
router.patch("/:id", async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({
      error: "Invalid transfer ID"
    });
  }

  const {
    fromAccountId,
    toAccountId,
    amount,
    description,
    transferDate
  } = req.body ?? {};

  const transfer =
    await prisma.transfer.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

  if (!transfer) {
    return res.status(404).json({
      error: "Transfer not found"
    });
  }

  if (
    fromAccountId === undefined &&
    toAccountId === undefined &&
    amount === undefined &&
    description === undefined &&
    transferDate === undefined
  ) {
    return res.status(400).json({
      error:
        "At least one field must be provided"
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "description must be a string"
    });
  }

  const newFromAccountId =
    fromAccountId ??
    transfer.fromAccountId;

  const newToAccountId =
    toAccountId ??
    transfer.toAccountId;

  if (
    !isValidUUID(newFromAccountId) ||
    !isValidUUID(newToAccountId)
  ) {
    return res.status(400).json({
      error:
        "fromAccountId and toAccountId must be valid UUIDs"
    });
  }

  if (
    newFromAccountId ===
    newToAccountId
  ) {
    return res.status(400).json({
      error:
        "Source and destination accounts must be different"
    });
  }

  if (
    amount !== undefined &&
    !isPositiveMoney(amount)
  ) {
    return res.status(400).json({
      error:
        "amount must be a valid positive number with up to 4 decimal places"
    });
  }

  if (
    transferDate !== undefined &&
    !isValidDate(transferDate)
  ) {
    return res.status(400).json({
      error:
        "transferDate must be a valid ISO date"
    });
  }

  const [fromAccount, toAccount] =
    await Promise.all([
      prisma.account.findFirst({
        where: {
          id: newFromAccountId,
          userId: req.userId
        }
      }),

      prisma.account.findFirst({
        where: {
          id: newToAccountId,
          userId: req.userId
        }
      })
    ]);

  if (!fromAccount || !toAccount) {
    return res.status(400).json({
      error:
        "Invalid source or destination account"
    });
  }

  if (
    (
      fromAccountId !== undefined ||
      toAccountId !== undefined
    ) &&
    (
      !fromAccount.isActive ||
      !toAccount.isActive
    )
  ) {
    return res.status(400).json({
      error:
        "Transfers cannot be moved to inactive accounts"
    });
  }

  if (
    fromAccount.currencyCode !==
    toAccount.currencyCode
  ) {
    return res.status(400).json({
      error:
        "Both accounts must use the same currency"
    });
  }

  const newAmount =
    amount !== undefined
      ? String(amount)
      : transfer.amount;

  const newDate =
    transferDate !== undefined
      ? new Date(transferDate)
      : transfer.transferDate;

  const updatedTransfer =
    await prisma.transfer.update({
      where: {
        id: transfer.id
      },

      data: {
        fromAccountId:
          newFromAccountId,
        toAccountId:
          newToAccountId,
        amount: newAmount,
        currencyCode:
          fromAccount.currencyCode,

        ...(description !== undefined && {
          description:
            description?.trim() || null
        }),

        transferDate: newDate
      }
    });

  res.json(updatedTransfer);
});

// DELETE transfer
router.delete("/:id", async (req, res) => {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({
      error: "Invalid transfer ID"
    });
  }

  const transfer =
    await prisma.transfer.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

  if (!transfer) {
    return res.status(404).json({
      error: "Transfer not found"
    });
  }

  await prisma.transfer.delete({
    where: {
      id: transfer.id
    }
  });

  res.status(204).send();
});

export default router;