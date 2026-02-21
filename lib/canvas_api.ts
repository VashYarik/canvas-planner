
// Helper to handle fetch requests
async function canvasFetch(endpoint: string, params: Record<string, string> = {}, accessToken?: string) {
    const CANVAS_BASE_URL = process.env.CANVAS_BASE_URL;
    // Fallback to env token if not provided (legacy support)
    const token = accessToken || process.env.CANVAS_ACCESS_TOKEN;

    if (!CANVAS_BASE_URL || !token) {
        throw new Error('Missing Canvas credentials (BASE_URL or Token).');
    }

    // Remove trailing headers from base URL if present
    let baseUrl = CANVAS_BASE_URL.replace(/\/$/, '');
    // Ensure protocol
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }

    // Construct URL with query params
    // Use try-catch for URL construction to debug
    let url: URL;
    try {
        url = new URL(`${baseUrl}/api/v1/${endpoint}`);
    } catch (e: any) {
        console.error(`Invalid URL constructed from base '${baseUrl}' and endpoint '${endpoint}'`);
        throw new Error(`Invalid URL: ${e.message}`);
    }

    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    console.log(`[CanvasAPI] Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.error(`[CanvasAPI] Error ${response.status}: ${response.statusText}`);
        const text = await response.text();
        console.error(`[CanvasAPI] Response body: ${text}`);
        throw new Error(`Canvas API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export interface CanvasCourse {
    id: number;
    name: string;
    course_code: string;
    start_at: string;
    end_at: string | null;
    syllabus_body?: string;
}

export interface CanvasAssignment {
    id: number;
    name: string;
    description: string; // HTML
    due_at: string | null;
    points_possible: number;
    course_id: number;
    html_url: string;
}

export async function listCourses(token?: string): Promise<CanvasCourse[]> {
    // Fetch courses interactively where the user is a student
    // 'enrollment_type': 'student', 'enrollment_state': 'active'
    return canvasFetch('courses', {
        'enrollment_type': 'student',
        'enrollment_state': 'active',
        'per_page': '50',
        'include[]': 'syllabus_body'
    }, token);
}

export async function listAssignments(courseId: string | number, token?: string): Promise<CanvasAssignment[]> {
    return canvasFetch(`courses/${courseId}/assignments`, {
        'per_page': '50',
        'include[]': 'submission' // optional, to check if submitted
    }, token);
}
