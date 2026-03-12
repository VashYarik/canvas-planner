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
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 font-nunito text-text-soft">
            <h1 className="text-3xl sm:text-4xl font-lora font-medium text-text-soft tracking-tight">Manage Courses</h1>
            <CourseManager initialCourses={courses} />
        </div>
    );
}
