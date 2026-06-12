import { z } from "zod";

import { isValidDateInput } from "@/lib/utils";

const dateInputSchema = z.string().trim().refine(isValidDateInput, {
  message: "Invalid date format",
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email: z
    .string()
    .trim()
    .email("Email is invalid")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email is invalid")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const coupleCreateSchema = z.object({
  startDate: dateInputSchema.optional(),
});

export const coupleJoinSchema = z.object({
  code: z.string().trim().min(4).max(12),
});

export const coupleUpdateSchema = z.object({
  startDate: dateInputSchema,
});

export const memoryCreateSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().trim().min(1).max(280),
});

export const journalCreateSchema = z.object({
  title: z.string().trim().min(1).max(140),
  content: z.string().trim().min(1),
  imageUrl: z.string().url().nullable().optional(),
});

export const journalUpdateSchema = journalCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const eventCreateSchema = z.object({
  title: z.string().trim().min(1).max(140),
  eventDate: z.string().min(1, "Date is required"),
  type: z.string().trim().min(1).max(60),
});

export const eventUpdateSchema = eventCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const noteCreateSchema = z.object({
  content: z.string().trim().min(1).max(500),
  isPinned: z.boolean().optional(),
});

export const noteUpdateSchema = z
  .object({
    content: z.string().trim().min(1).max(500).optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const uploadImageSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  type: z.string().trim().refine((value) => value.startsWith("image/"), {
    message: "Only image uploads are allowed",
  }),
});
