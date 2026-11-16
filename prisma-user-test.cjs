const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({
      select: { id: true, email: true }
    });
    console.log("USER TABLE SUCCESS:", user ? "Records found" : "Table is empty");
  } catch (error) {
    console.log("USER TABLE FAILED:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
