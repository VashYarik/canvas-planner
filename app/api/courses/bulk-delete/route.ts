
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BulkDeleteSchema = z.object({
    ids: z.array(z.string())
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ids } = BulkDeleteSchema.parse(body);

        if (ids.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        // Transactional delete to ensure everything is cleaned up
        await prisma.$transaction(async (tx) => {
            // ONLY delete ClassPeriods (schedule), preserve Course and WorkBlocks/Tasks
            await tx.classPeriod.deleteMany({
                where: { courseId: { in: ids } }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Bulk Delete Courses Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
