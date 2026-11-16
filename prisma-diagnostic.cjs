const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Testing raw SQL...");
    console.log(await prisma.$queryRaw`SELECT 1`);

    console.log("Testing User table...");
    console.log(await prisma.user.count());

    console.log("Both tests succeeded.");
  } catch (error) {
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
