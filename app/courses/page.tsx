
import { prisma } from '@/lib/prisma';
import CourseManager from '@/app/courses/CourseManager';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
    const courses = await prisma.course.findMany({
        orderBy: { name: 'asc' },
        include: {
            classPeriods: true
        }
    });

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Manage Courses</h1>
            <CourseManager initialCourses={courses} />
        </div>
    );
}
