const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PALETTE = ['#737883', '#86919D', '#B9BABD', '#F1F0EE', '#E8DED1', '#BE9E82'];

async function main() {
    console.log("Fetching courses...");
    const courses = await prisma.course.findMany();
    console.log(`Found ${courses.length} courses to update.`);

    for (const c of courses) {
        const sourceIdStr = c.sourceId || c.id;
        let hash = 0;
        for (let i = 0; i < sourceIdStr.length; i++) hash = sourceIdStr.charCodeAt(i) + ((hash << 5) - hash);
        const color = PALETTE[Math.abs(hash) % PALETTE.length];

        await prisma.course.update({
            where: { id: c.id },
            data: { color }
        });
        console.log(`Updated course ${c.code} to ${color}`);
    }
    console.log("Done updating all course colors!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
