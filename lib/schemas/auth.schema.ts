import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or username.")
    .refine(
      (value) =>
        z.email().safeParse(value).success ||
        /^[a-zA-Z0-9._-]{3,32}$/.test(value),
      "Enter a valid email or a username with 3–32 characters.",
    ),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(100, "Use no more than 100 characters."),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use no more than 128 characters.")
      .regex(/[a-z]/, "Add a lowercase letter.")
      .regex(/[A-Z]/, "Add an uppercase letter.")
      .regex(/[0-9]/, "Add a number.")
      .regex(/[^A-Za-z0-9]/, "Add a symbol."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    acceptTerms: z
      .boolean()
      .refine((value) => value, "Please accept the Terms & Conditions."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
