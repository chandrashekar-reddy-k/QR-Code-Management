/**
 * Validates whether a string is a valid UUID format (v1-v5).
 * Prevents PostgreSQL / Prisma runtime crash:
 * 'invalid input syntax for type uuid'
 */
export const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

export default { isUUID };
