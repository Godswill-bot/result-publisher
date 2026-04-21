import { z } from "zod";

const matricNumberSchema = z
  .string()
  .trim()
  .min(3, "Matric number is required")
  .max(40, "Matric number is too long")
  .transform((value) => value.toUpperCase().replace(/\s+/g, ""))
  .refine((value) => /^[A-Z0-9-]+$/.test(value), {
    message: "Matric number may only contain letters, numbers, and hyphens",
  });

const phoneNumberSchema = z
  .string()
  .trim()
  .min(7, "Phone number is required")
  .max(24, "Phone number is too long")
  .refine((value) => /^[+0-9()\-\s]+$/.test(value), {
    message: "Phone number contains invalid characters",
  });

export const studentRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  matricNumber: matricNumberSchema,
  email: z.string().trim().email("Enter a valid personal email address"),
  mtuEmail: z.string().trim().email("Enter a valid school email address"),
  phoneNumber: phoneNumberSchema,
  parentEmail: z.string().trim().email("Enter a valid parent email address"),
  parentPhone: phoneNumberSchema,
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid admin email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const publishResultsSchema = z.object({
  matricNumbers: z.array(matricNumberSchema).optional(),
  retryOnlyFailed: z.boolean().optional().default(true),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type PublishResultsInput = z.infer<typeof publishResultsSchema>;
