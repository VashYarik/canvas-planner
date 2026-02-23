const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.length);
  if (users.length === 0) {
    console.log('Creating a default user...');
    await prisma.user.create({
      data: {
        name: 'Default User',
        preferences: '{}',
        workDays: '[false, true, true, true, true, true, false]',
      }
    });
    console.log('User created.');
  } else {
    console.log('User exists:', users[0]);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
