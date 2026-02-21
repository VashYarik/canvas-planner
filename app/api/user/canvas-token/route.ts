import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/user/canvas-token - Check if the user has a token configured
export async function GET() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return a boolean so we don't leak the token to the frontend
        return NextResponse.json({ hasToken: !!user.canvasAccessToken });
    } catch (error) {
        console.error('Failed to fetch Canvas token status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/user/canvas-token - Save or clear the user's canvas token
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // If the token is empty/null, we clear it (disconnect)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                canvasAccessToken: token || null
            }
        });

        return NextResponse.json({ success: true, hasToken: !!token });
    } catch (error) {
        console.error('Failed to update Canvas token:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
