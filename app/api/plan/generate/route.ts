import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePlan } from '@/lib/planner';
import { startOfWeek } from 'date-fns';
import { getDbUser } from '@/lib/auth';

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

        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
