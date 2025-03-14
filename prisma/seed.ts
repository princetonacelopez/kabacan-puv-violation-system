import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  // Seed Users
  const adminUser = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      username: "admin",
      password: "$2b$10$Xo0x8u9g3rF9pK8kL5mX6u/P7q8r9s0tU1vW2xY3z4v5b6c7d8e9f", // Hashed "password123"
      role: "ADMIN",
    },
  });

  const enforcerUser = await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: {
      username: "enforcer",
      password: "$2b$10$Xo0x8u9g3rF9pK8kL5mX6u/P7q8r9s0tU1vW2xY3z4v5b6c7d8e9f", // Hashed "password123"
      role: "TRAFFIC_ENFORCER",
    },
  });

  // Seed Vehicles (10 sample vehicles)
  for (let i = 0; i < 10; i++) {
    const plateNumber = `PLT${i.toString().padStart(3, "0")}`;
    await prisma.vehicle.upsert({
      where: { plateNumber },
      update: {},
      create: {
        plateNumber,
        vehicleType: faker.helpers.arrayElement(["MULTICAB", "VAN"]),
      },
    });
  }

  // Seed Violations (50 sample violations)
  for (let i = 0; i < 50; i++) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { plateNumber: `PLT${Math.floor(Math.random() * 10).toString().padStart(3, "0")}` },
    });
    if (!vehicle) continue;

    const violation = await prisma.violation.create({
      data: {
        vehicle: { connect: { id: vehicle.id } }, // Connect to the existing vehicle
        violationType: "TERMINAL_FEE",
        dateTime: faker.date.between({ from: "2025-01-01", to: "2025-03-31" }),
        fineAmount: faker.number.float({ min: 100, max: 1000, fractionDigits: 2 }),
        status: faker.helpers.arrayElement(["UNPAID", "PARTIALLY_PAID", "PAID"]),
        creator: { connect: { id: 1 } },
      },
    });

    // Randomly create payments for some violations
    if (Math.random() > 0.3) { // 70% chance of having a payment
      const paymentCount = Math.floor(Math.random() * 3) + 1; // 1-3 payments
      const totalPaid = faker.number.float({ min: 50, max: violation.fineAmount - 50, fractionDigits: 2 });

      for (let j = 0; j < paymentCount; j++) {
        const paymentDate = faker.date.between({ from: violation.dateTime, to: "2025-03-31" });
        const paymentAmount = Math.min(totalPaid / paymentCount, violation.fineAmount - (j > 0 ? paymentCount * 10 : 0));

        await prisma.payment.create({
          data: {
            violationId: violation.id,
            amount: paymentAmount,
            updatedBy: 1,
          },
        });
      }

      // Update violation status based on payments
      const payments = await prisma.payment.findMany({
        where: { violationId: violation.id },
      });
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = violation.fineAmount - paidAmount;
      let newStatus = violation.status;
      if (remaining <= 0) newStatus = "PAID";
      else if (paidAmount > 0) newStatus = "PARTIALLY_PAID";

      if (newStatus !== violation.status) {
        await prisma.violation.update({
          where: { id: violation.id },
          data: { status: newStatus },
        });
      }
    }
  }

  // Seed Actions (10 sample actions)
  for (let i = 0; i < 10; i++) {
    await prisma.action.create({
      data: {
        userId: i % 2 === 0 ? 1 : 2,
        action: faker.lorem.sentence(),
      },
    });
  }

  console.log("Seeded users, vehicles, violations, payments, and actions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });