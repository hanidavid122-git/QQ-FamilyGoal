-- Run this script in your Supabase SQL Editor to restore historical data.
-- This will add 54 points to the '爸爸' account as a "History Data Recovery" transaction.
-- If you want to assign it to another member, change '爸爸' to the desired role.

INSERT INTO public.transactions (id, member, amount, reason, type, date)
VALUES (
  'history_restore_54', -- Unique ID to prevent duplicates
  '爸爸',               -- Member to receive the points
  54,                   -- Amount of points
  '历史数据恢复',       -- Reason
  'earned',             -- Type
  NOW()                 -- Date
)
ON CONFLICT (id) DO NOTHING;
