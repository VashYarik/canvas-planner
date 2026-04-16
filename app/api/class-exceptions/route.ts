import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDbUser } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const user = await getDbUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { courseId, classPeriodId, date, exceptionType } = body;

        if (!courseId || !classPeriodId || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const period = await prisma.classPeriod.findUnique({
            where: { id: classPeriodId },
            include: { course: true }
        });

        if (!period || period.course.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const exception = await prisma.classException.create({
            data: {
                courseId,
                classPeriodId,
                date,
                exceptionType: exceptionType || 'canceled'
            }
        });

        return NextResponse.json(exception);
    } catch (error) {
        console.error('Error creating class exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getDbUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { classPeriodId, date } = body;

        if (!classPeriodId || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const period = await prisma.classPeriod.findUnique({
            where: { id: classPeriodId },
            include: { course: true }
        });

        if (!period || period.course.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.classException.deleteMany({
            where: {
                classPeriodId,
                date
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting class exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
