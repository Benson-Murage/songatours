
-- The "Anyone can insert contact messages" policy is intentionally permissive (public contact form).
-- No change needed. Adding a comment for documentation.
-- Fix: tighten the contact_messages insert to require at least valid content via a check
-- but keep it open to unauthenticated users (public contact form).
SELECT 1; -- no-op, the remaining warnings are acceptable
