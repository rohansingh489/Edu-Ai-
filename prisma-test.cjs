const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT 1");
    console.log("SUCCESS:", result);
  } catch (error) {
    console.log("FAILED:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
