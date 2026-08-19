import { z } from "zod";

/**
 * The one password policy, mirroring @ValidPassword on the backend.
 *
 * The backend used to enforce three different rules for the same credential,
 * and the frontend grew four copies of this block. Both are now single
 * definitions, and they must stay in step: anything this accepts that the
 * backend rejects becomes a server error on submit instead of inline
 * validation, which is the failure this file exists to prevent.
 *
 * Backend counterpart:
 * zembil-gift-backend-service/src/main/java/com/gogerami/backend/validation/ValidPassword.java
 */
export const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/^(?=.*[a-z])/, "Password must contain at least one lowercase letter")
  .regex(/^(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
  .regex(/^(?=.*\d)/, "Password must contain at least one number")
  .regex(
    /^(?=.*[@$!%*?&#^()_+=\-\[\]{}|;:',.<>/~`])/,
    "Password must contain at least one special character"
  );
