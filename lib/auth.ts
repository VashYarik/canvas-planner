import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';

/**
 * Gets the current authenticated user from the database.
 * If the user doesn't exist in our DB yet but is logged into Clerk,
 * this function will create a new default user record for them.
 * 
 * Returns null if the user is not authenticated.
 */
export async function getDbUser() {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
        return null; // Not logged in
    }

    // Attempt to find the user in our database
    let dbUser = await prisma.user.findUnique({
        where: { clerkId }
    });

    // If not found, create a new user record for them
    if (!dbUser) {
        const clerkUser = await currentUser();
        const fallbackName = clerkUser?.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
            : 'New User';

        dbUser = await prisma.user.create({
            data: {
                clerkId,
                name: fallbackName,
                preferences: '{}',
                workDays: '[false, true, true, true, true, true, false]', // Default Mon-Fri
            }
        });
    }

    return dbUser;
}
