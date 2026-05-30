import * as yup from 'yup';

export const brandSchema = yup.object({
  name: yup.string().required('Brand name is required').trim(),
  image: yup
    .mixed<File>()
    .nullable()
    .test('image-required', 'Brand image is required', function (value) {
      const { isEditMode } = this.parent;
      // Image is only required in add mode
      if (!isEditMode) {
        return !!value;
      }
      return true;
    })
    .test('file-size', 'Image must be less than 10MB', function (value) {
      if (value && value instanceof File) {
        return value.size <= 10 * 1024 * 1024; // 10MB
      }
      return true;
    })
    .test('file-type', 'Only image files are allowed', function (value) {
      if (value && value instanceof File) {
        return value.type.startsWith('image/');
      }
      return true;
    }),
  isEditMode: yup.boolean().default(false),
});

export type BrandFormData = yup.InferType<typeof brandSchema>;