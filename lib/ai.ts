import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const openai = createOpenAI({
    apiKey: process.env.AI_ACCESS_TOKEN,
});

export const TaskEstimationSchema = z.object({
    estimatedMinutes: z.number().describe('The estimated time in minutes to complete this task.'),
    difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty content of the task.'),
    explanation: z.string().describe('A brief explanation for the estimate.')
});

export async function estimateTaskDuration(taskTitle: string, taskDescription?: string | null, courseName?: string) {
    try {
        const prompt = `
      Estimate the time required to complete the following academic task:
      Task: ${taskTitle}
      ${taskDescription ? `Description: ${taskDescription}` : ''}
      ${courseName ? `Course: ${courseName}` : ''}
      
      Guidelines:
      1. Analyze the Course Name: STEM courses (Calculus, Physics, CS) generally require 1.5x-2x more time than introductory humanities.
      2. Analyze the Assignment Type:
         - "Read Chapter": 60-90 mins
         - "Problem Set" / "Math Homework": 90-180 mins
         - "Essay" (1-3 pages): 90-180 mins
         - "Project" / "Exam Prep": 180 mins
      3. CRITICAL LIMIT: The maximum estimated time is 180 minutes (3 hours). Never exceed 180. If a task is 180 minutes, it should be marked as "hard" difficulty.
      
      Return a realistic estimate in minutes based on these factors, capped at 180.
    `;

        const { object } = await generateObject({
            model: openai('gpt-4o'),
            schema: TaskEstimationSchema,
            prompt,
        });

        return object;
    } catch (error) {
        console.error('AI Estimation Error:', error);
        // Fallback to heuristic
        return { estimatedMinutes: 60, difficulty: 'medium', explanation: 'Fallback due to AI error' };
    }
}
