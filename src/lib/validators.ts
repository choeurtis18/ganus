import { z } from 'zod';

export const EmailSchema = z.string().email();

export const PasswordSchema = z.string().min(8);

export const SignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(2).optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string(),
});

export const ProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobType: z.enum(['internship', 'cdi', 'contract', 'freelance']),
  experience: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
});

export const ChatMessageSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1).max(5000),
});

export const CVUploadSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export const CreateChatSessionSchema = z.object({
  interviewType: z.enum(['behavioral', 'technical', 'general', 'company-specific']),
});
