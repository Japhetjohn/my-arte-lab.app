import { z } from 'zod';

// Password regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Registration step 1 schema
export const registerStep1Schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>;

// Registration step 2 schema
export const registerStep2Schema = z.object({
  gender: z.enum(['male', 'female', 'other']),
  avatar: z.string().optional(),
  coverImage: z.string().optional(),
});

export type RegisterStep2Data = z.infer<typeof registerStep2Schema>;

// Registration step 3 schema
export const registerStep3Schema = z.object({
  role: z.enum(['client', 'creator']),
  gender: z.enum(['male', 'female', 'other']).optional(),
  location: z.object({
    localArea: z.string().min(1, 'Local area is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  category: z.string().optional(),
  agreeToTerms: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.role === 'creator') {
      return !!data.category && data.category.length > 0;
    }
    return true;
  },
  {
    message: 'Please select a category for your creator profile',
    path: ['category'],
  }
);

export type RegisterStep3Data = z.infer<typeof registerStep3Schema>;

// Full registration schema (combines all steps)
export const registerSchema = registerStep1Schema
  .merge(registerStep2Schema)
  .merge(registerStep3Schema);

export type RegisterFormData = z.infer<typeof registerSchema>;

// Email verification schema
export const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        PASSWORD_REGEX,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Profile update schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z
    .object({
      localArea: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// Creator categories
export const CREATOR_CATEGORIES = [
  { id: 'photography', name: 'Photography', icon: 'Camera' },
  { id: 'design', name: 'Design', icon: 'Palette' },
  { id: 'music', name: 'Music & Audio', icon: 'Music' },
  { id: 'video', name: 'Video & Animation', icon: 'Video' },
  { id: 'writing', name: 'Writing & Translation', icon: 'PenTool' },
  { id: 'marketing', name: 'Marketing', icon: 'TrendingUp' },
  { id: 'programming', name: 'Programming & Tech', icon: 'Code' },
  { id: 'business', name: 'Business', icon: 'Briefcase' },
] as const;
