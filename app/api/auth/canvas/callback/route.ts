import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `Canvas Auth Error: ${error}` }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;
    const CANVAS_CLIENT_ID = process.env.CANVAS_CLIENT_ID;
    const CANVAS_CLIENT_SECRET = process.env.CANVAS_CLIENT_SECRET;
    const REDIRECT_URI = process.env.CANVAS_REDIRECT_URI || 'http://localhost:3000/api/auth/canvas/callback';

    if (!CANVAS_BASE_URL || !CANVAS_CLIENT_ID || !CANVAS_CLIENT_SECRET) {
        return NextResponse.json({ error: 'Canvas configuration missing' }, { status: 500 });
    }

    try {
        // Exchange code for token
        const baseUrl = CANVAS_BASE_URL.replace(/\/$/, '');
        const tokenUrl = `${baseUrl}/login/oauth2/token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: CANVAS_CLIENT_ID,
                client_secret: CANVAS_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Token Exchange Failed:', errText);
            return NextResponse.json({ error: 'Failed to exchange token' }, { status: response.status });
        }

        const data = await response.json();
        // data = { access_token, refresh_token, user: { id, name }, expires_in }

        // Store tokens for the current user
        // Assuming single-user mode for now, just find the first user or ensure user exists
        let user = await prisma.user.findFirst();
        if (!user) {
            // Create a default user if none exists (first login)
            user = await prisma.user.create({
                data: {
                    name: data.user.name || 'Student',
                    preferences: '{}',
                    workDays: '{}'
                }
            });
        }

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                canvasAccessToken: data.access_token,
                canvasRefreshToken: data.refresh_token,
                canvasTokenExpiresAt: expiresAt
            }
        });

        // Redirect back to settings with success
        return NextResponse.redirect(new URL('/settings?status=connected', request.url));

    } catch (err: any) {
        console.error('Auth Callback Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
