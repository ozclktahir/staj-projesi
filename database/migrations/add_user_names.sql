-- Migration: add_user_names
-- Supabase SQL Editor'de çalıştırın (Prisma migrate yerine).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
