import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDbUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const blocks = await prisma.availabilityBlock.findMany({
            where: { userId: user.id },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });

        if (blocks.length === 0) {
            // Generate default 8am - 8pm availability for all 7 days
            const defaultBlocks = Array.from({ length: 7 }).map((_, i) => ({
                userId: user.id,
                dayOfWeek: i,
                startTime: '08:00',
                endTime: '20:00'
            }));

            await prisma.availabilityBlock.createMany({
                data: defaultBlocks
            });

            const newBlocks = await prisma.availabilityBlock.findMany({
                where: { userId: user.id },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
            });

            return NextResponse.json(newBlocks);
        }

        return NextResponse.json(blocks);
    } catch (error) {
        console.error('Failed to fetch availability:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { blocks } = body; // Array of { dayOfWeek, startTime, endTime }

        if (!Array.isArray(blocks)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Transaction: Delete old blocks, insert new ones
        await prisma.$transaction([
            prisma.availabilityBlock.deleteMany({ where: { userId: user.id } }),
            prisma.availabilityBlock.createMany({
                data: blocks.map((b: any) => ({
                    userId: user.id,
                    dayOfWeek: b.dayOfWeek,
                    startTime: b.startTime,
                    endTime: b.endTime
                }))
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update availability:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
