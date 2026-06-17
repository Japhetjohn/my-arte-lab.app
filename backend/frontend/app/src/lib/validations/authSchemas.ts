import { z } from 'zod';

// Password regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
// Must match backend regex: [@$!%*?&_\-#]
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

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
  categories: z.array(z.string()).optional(),
  agreeToTerms: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.role === 'creator') {
      const cats = data.categories;
      return Array.isArray(cats) && cats.length > 0 && cats.length <= 3;
    }
    return true;
  },
  {
    message: 'Please select 1 to 3 categories for your creator profile',
    path: ['categories'],
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

// Creator categories - MUST match backend CREATOR_CATEGORIES in utils/constants.js
export const CREATOR_CATEGORIES = [
  { id: 'photography', name: 'Photography', icon: 'Camera' },
  { id: 'videography', name: 'Videography & Video Editing', icon: 'Video' },
  { id: 'graphic_design', name: 'Graphic Design', icon: 'Palette' },
  { id: 'ui_ux_design', name: 'UI/UX Design', icon: 'Layout' },
  { id: 'content_creation', name: 'Content Creation', icon: 'Zap' },
  { id: 'ugc_creators', name: 'UGC Creators', icon: 'Users' },
  { id: 'creative_direction', name: 'Creative Direction', icon: 'Compass' },
  { id: 'motion_graphics', name: 'Motion Graphics & Animation', icon: 'Activity' },
  { id: 'crafts_handmade', name: 'Crafts & Handmade Arts', icon: 'Scissors' },
  { id: 'other', name: 'Others', icon: 'Briefcase' },
] as const;
