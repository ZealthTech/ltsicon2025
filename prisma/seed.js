const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma?.role?.createMany({
    data: [
      { id: 1, name: 'ADMIN' },
      { id: 2, name: 'LTSI COUNCIL' },
      { id: 3, name: 'USER' },
      { id: 4, name: 'EDITOR' },
    ],
    skipDuplicates: true, // Prevent errors if seeding more than once
  });

  console.log('Roles seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
