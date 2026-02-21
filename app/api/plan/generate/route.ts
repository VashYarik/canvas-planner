import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePlan } from '@/lib/planner';
import { startOfWeek } from 'date-fns';

export async function POST(request: Request) {
    try {
        let mode: 'reset' | 'update' = 'reset';
        try {
            const body = await request.json();
            if (body.mode === 'update') {
                mode = 'update';
            }
        } catch (e) {
            // body might be empty
        }

        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const today = new Date();
        // Start planning from today/now
        const plan = await generatePlan(user.id, today, mode);

        return NextResponse.json({ success: true, blocks: plan.length });
    } catch (error: any) {
        console.error('Plan Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
