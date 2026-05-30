import * as yup from 'yup';

export const mediaSchema = yup.object({
  file: yup
    .mixed<File | null>()
    .required('File is required')
    .test('fileSize', 'File size is too large', (value) => {
      if (!value) return false;
      if (value instanceof File) {
        return value.size <= 10 * 1024 * 1024; // 10MB
      }
      return false;
    })
    .test('fileType', 'Unsupported file format', (value) => {
      if (!value) return false;
      if (value instanceof File) {
        return ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'].includes(value.type);
      }
      return false;
    }) as yup.Schema<File | null>,

  sellerName: yup
    .string()
    .max(100, 'Seller name cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),

  subDirectory: yup
    .string()
    .required('Sub directory is required')
    .trim(),
});

export type MediaFormData = yup.InferType<typeof mediaSchema>;

