// prisma/seed.ts
import { PrismaClient, Role, VehicleType, ViolationType, Status } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Generate a random date between two dates in Asia/Manila timezone, stored as UTC
function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  const randomDate = new Date(randomTime);
  
  // Convert to Asia/Manila time to get the correct local components
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(randomDate);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);
  const hour = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  const second = parseInt(parts.find((p) => p.type === "second")!.value, 10);

  // Create a date in Asia/Manila timezone
  const localDate = new Date(year, month, day, hour, minute, second);
  
  // Convert back to UTC for storage
  const offset = 8 * 60 * 60 * 1000; // Asia/Manila is UTC+8
  return new Date(localDate.getTime() - offset);
}

// Generate a Philippine phone number
function generatePhilippinePhoneNumber(): string {
  const prefixes = ["912", "913", "914", "915", "916", "917", "918", "919"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `+63${prefix}-${number}`;
}

async function main() {
  // Seed Users (5 users: 2 admins, 3 traffic enforcers)
  const usersData = [
    {
      id: randomUUID(),
      username: "admin1",
      password: await bcrypt.hash("password123", 10),
      fullName: "John Admin",
      email: "john.admin@example.com",
      phone: generatePhilippinePhoneNumber(),
      position: "Senior Administrator",
      role: Role.ADMIN,
      active: true,
    },
    {
      id: randomUUID(),
      username: "admin2",
      password: await bcrypt.hash("password123", 10),
      fullName: "Jane Admin",
      email: "jane.admin@example.com",
      phone: generatePhilippinePhoneNumber(),
      position: "Administrator",
      role: Role.ADMIN,
      active: true,
    },
    {
      id: randomUUID(),
      username: "enforcer1",
      password: await bcrypt.hash("password123", 10),
      fullName: "Mark Enforcer",
      email: "mark.enforcer@example.com",
      phone: generatePhilippinePhoneNumber(),
      position: "Traffic Officer",
      role: Role.TRAFFIC_ENFORCER,
      active: true,
    },
    {
      id: randomUUID(),
      username: "enforcer2",
      password: await bcrypt.hash("password123", 10),
      fullName: "Sarah Enforcer",
      email: "sarah.enforcer@example.com",
      phone: generatePhilippinePhoneNumber(),
      position: "Traffic Officer",
      role: Role.TRAFFIC_ENFORCER,
      active: true,
    },
    {
      id: randomUUID(),
      username: "enforcer3",
      password: await bcrypt.hash("password123", 10),
      fullName: "Tom Enforcer",
      email: "tom.enforcer@example.com",
      phone: generatePhilippinePhoneNumber(),
      position: "Traffic Officer",
      role: Role.TRAFFIC_ENFORCER,
      active: true,
    },
  ];

  const users = [];
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: userData,
      select: { id: true },
    });
    users.push(user);
  }

  // Seed Vehicles (50 sample vehicles)
  const vehicles = [];
  for (let i = 1; i <= 50; i++) {
    const plateNumber = `ABC-${i.toString().padStart(4, "0")}`; // e.g., ABC-0001 to ABC-0050
    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber },
      update: {},
      create: {
        id: randomUUID(),
        plateNumber,
        vehicleType: faker.helpers.arrayElement([VehicleType.MULTICAB, VehicleType.VAN]),
      },
    });
    vehicles.push(vehicle);
  }

  // Seed Violations (500 violations distributed from October 2024 to March 2025)
  const startDate = new Date("2024-10-01T00:00:00+08:00"); // October 1, 2024, 00:00 in Asia/Manila
  const endDate = new Date("2025-03-31T23:59:59+08:00");   // March 31, 2025, 23:59 in Asia/Manila
  for (let i = 0; i < 500; i++) {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)]; // Random vehicle
    const creator = users[Math.floor(Math.random() * users.length)]; // Random user
    const fineAmount = vehicle.vehicleType === VehicleType.MULTICAB ? 20 : 30; // Fixed fines

    const violation = await prisma.violation.create({
      data: {
        id: randomUUID(),
        vehicle: { connect: { id: vehicle.id } },
        violationType: ViolationType.TERMINAL_FEE,
        dateTime: randomDateBetween(startDate, endDate),
        fineAmount,
        status: faker.helpers.arrayElement([Status.UNPAID, Status.PARTIALLY_PAID, Status.PAID]),
        creator: { connect: { id: creator.id } },
      },
    });

    // Randomly create payments for some violations (70% chance)
    if (Math.random() > 0.3 && violation.status !== Status.PAID) {
      const paymentCount = Math.floor(Math.random() * 3) + 1; // 1-3 payments
      let totalPaid = 0;
      const updater = users[Math.floor(Math.random() * users.length)]; // Random user
      const minPayment = 5;

      for (let j = 0; j < paymentCount; j++) {
        const remainingFine = fineAmount - totalPaid;
        if (remainingFine < minPayment) break; // Stop if remaining fine is less than the minimum payment

        const paymentAmount = faker.number.int({ min: minPayment, max: Math.min(remainingFine, fineAmount) });
        totalPaid += paymentAmount;

        await prisma.payment.create({
          data: {
            id: randomUUID(),
            violationId: violation.id,
            amount: paymentAmount,
            dateTime: randomDateBetween(violation.dateTime, new Date("2025-03-31T23:59:59+08:00")),
            updatedBy: updater.id,
          },
        });
      }

      const remaining = fineAmount - totalPaid;
      let newStatus = violation.status;
      if (remaining <= 0) newStatus = Status.PAID;
      else if (totalPaid > 0) newStatus = Status.PARTIALLY_PAID;

      if (newStatus !== violation.status) {
        await prisma.violation.update({
          where: { id: violation.id },
          data: { status: newStatus },
        });
      }
    }
  }

  // Seed Actions (15 sample actions)
  for (let i = 1; i <= 15; i++) {
    const user = users[Math.floor(Math.random() * users.length)]; // Random user
    await prisma.action.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        action: faker.helpers.arrayElement([
          "Logged in",
          "Created a violation",
          "Updated a payment",
          "Deactivated a user",
          "Viewed dashboard",
        ]),
        timestamp: randomDateBetween(startDate, endDate),
      },
    });
  }

  console.log("Database reset and seeded with new data: 500 violations from October 2024 to March 2025!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });