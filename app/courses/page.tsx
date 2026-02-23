import { prisma } from '@/lib/prisma';
import CourseManager from '@/app/courses/CourseManager';
import { getDbUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
    const user = await getDbUser();
    if (!user) {
        redirect('/sign-in');
    }

    const courses = await prisma.course.findMany({
        where: { userId: user.id },
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
