import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email address').or(z.literal('')),
  location: z.string().min(3, 'Location must be at least 3 characters long'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
