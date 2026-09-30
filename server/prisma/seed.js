import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const currencies = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPlaces: 2 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
];

const categories = [
  { name: "Salary", type: "INCOME" },
  { name: "Freelance", type: "INCOME" },
  { name: "Investments", type: "INCOME" },
  { name: "Food", type: "EXPENSE", children: ["Groceries", "Restaurants", "Delivery"] },
  { name: "Transport", type: "EXPENSE", children: ["Fuel", "Taxi", "Public Transport"] },
  { name: "Housing", type: "EXPENSE", children: ["Rent", "Utilities", "Maintenance"] },
  { name: "Health", type: "EXPENSE", children: ["Medical", "Fitness"] },
  { name: "Entertainment", type: "EXPENSE" },
  { name: "Shopping", type: "EXPENSE" },
  { name: "Education", type: "EXPENSE" },
];

async function ensureSystemCategory(name, type, parentId = null) {
  const existing = await prisma.category.findFirst({
    where: { userId: null, name, type, parentId },
  });

  return existing ?? prisma.category.create({
    data: { name, type, parentId },
  });
}

async function main() {
  await prisma.currency.createMany({ data: currencies, skipDuplicates: true });

  for (const category of categories) {
    const parent = await ensureSystemCategory(category.name, category.type);
    for (const childName of category.children ?? []) {
      await ensureSystemCategory(childName, category.type, parent.id);
    }
  }
}

main()
  .then(() => console.log("Seed complete."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
