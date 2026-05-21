-- 0008_update_provider_check.sql
-- Add 'google-translate' to the allowed providers in dictionary_cache check constraint

ALTER TABLE public.dictionary_cache 
DROP CONSTRAINT IF EXISTS dictionary_cache_provider_check;

ALTER TABLE public.dictionary_cache 
ADD CONSTRAINT dictionary_cache_provider_check 
CHECK (provider IN ('free-dict', 'mw', 'papago', 'datamuse', 'google-translate'));
