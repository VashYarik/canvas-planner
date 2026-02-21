import { NextResponse } from 'next/server';

export async function GET() {
    const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;
    const CANVAS_CLIENT_ID = process.env.CANVAS_CLIENT_ID;
    const REDIRECT_URI = process.env.CANVAS_REDIRECT_URI || 'http://localhost:3000/api/auth/canvas/callback';

    if (!CANVAS_BASE_URL || !CANVAS_CLIENT_ID) {
        return NextResponse.json({ error: 'Canvas configuration missing' }, { status: 500 });
    }

    // Remove trailing slash
    const baseUrl = CANVAS_BASE_URL.replace(/\/$/, '');

    // Construct Authorization URL
    // scope is optional for Canvas, usually defaults to full access for user
    const params = new URLSearchParams({
        client_id: CANVAS_CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state: 'random_state_string_here', // In prod use a real random string/session
        scope: 'url:GET|/api/v1/courses url:GET|/api/v1/courses/:id/assignments' // Basic scopes needed
    });

    const authUrl = `${baseUrl}/login/oauth2/auth?${params.toString()}`;

    return NextResponse.redirect(authUrl);
}
