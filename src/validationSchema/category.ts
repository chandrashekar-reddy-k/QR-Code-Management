import * as yup from 'yup';

export const categorySchema = yup.object({
  name: yup
    .string()
    .required('Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .trim(),
  
  slug: yup
    .string()
    .required('Slug is required')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .trim(),
  
  categorySubtitle: yup
    .string()
    .required('Category subtitle is required')
    .min(10, 'Subtitle must be at least 10 characters')
    .max(200, 'Subtitle cannot exceed 200 characters')
    .trim(),
  
  image: yup
    .mixed<File>()
    .required('Image is required')
    .test('fileSize', 'File size is too large', (value) => {
      if (!value) return false; // Required validation
      if (value instanceof File) {
        return value.size <= 10 * 1024 * 1024; // 10MB
      }
      return true; // For string URLs in edit mode
    })
    .test('fileType', 'Unsupported file format', (value) => {
      if (!value) return false; // Required validation
      if (value instanceof File) {
        return ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'].includes(value.type);
      }
      return true; // For string URLs in edit mode
    }),
  
  metaTitle: yup
    .string()
    .max(60, 'Meta title cannot exceed 60 characters')
    .trim()
    .optional()
    .nullable(),
  
  metaKeywords: yup
    .string() // Changed to string for form input
    .max(500, 'Meta keywords cannot exceed 500 characters')
    .trim()
    .optional()
    .nullable(),
  
  schemaMarkup: yup
    .string()
    .max(5000, 'Schema markup cannot exceed 5000 characters')
    .trim()
    .optional()
    .nullable(),
  
  metaDescription: yup
    .string()
    .max(160, 'Meta description cannot exceed 160 characters')
    .trim()
    .optional()
    .nullable(),
});

export type CategoryFormData = yup.InferType<typeof categorySchema>;