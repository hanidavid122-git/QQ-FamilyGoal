-- Run this script in your Supabase SQL Editor to update the database schema
-- for v2.1 Danmaku features.

-- 1. Ensure 'avatar' column in 'messages' table is TEXT type to support JSON storage
ALTER TABLE public.messages ALTER COLUMN avatar TYPE text;

-- 2. Ensure other columns are correct
ALTER TABLE public.messages ALTER COLUMN font_size TYPE text;
ALTER TABLE public.messages ALTER COLUMN color TYPE text;

-- 3. Add any missing columns if necessary (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'avatar') THEN
        ALTER TABLE public.messages ADD COLUMN avatar text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'font_size') THEN
        ALTER TABLE public.messages ADD COLUMN font_size text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'color') THEN
        ALTER TABLE public.messages ADD COLUMN color text;
    END IF;
END $$;
