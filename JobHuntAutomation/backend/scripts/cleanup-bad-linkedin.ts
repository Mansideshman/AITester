import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.job.deleteMany({
    where: { source: "linkedin", externalId: { startsWith: "http" } },
  });
  console.log("deleted", result.count, "bad-mapped linkedin jobs");
}

main().finally(() => prisma.$disconnect());
