import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PALETTE = ['#737883', '#86919D', '#B9BABD', '#F1F0EE', '#E8DED1', '#BE9E82'];

async function updateCourseColors() {
    console.log('Updating course colors...');
    const courses = await prisma.course.findMany();

    let updatedCount = 0;
    for (const course of courses) {
        let hash = 0;
        for (let i = 0; i < course.id.length; i++) {
            hash = course.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = PALETTE[Math.abs(hash) % PALETTE.length];

        await prisma.course.update({
            where: { id: course.id },
            data: { color }
        });
        updatedCount++;
    }

    console.log(`Updated ${updatedCount} courses to the new palette.`);
}

updateCourseColors()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
