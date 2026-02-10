-- Add first_name and last_name columns to profiles table
-- These allow users to set their name so friends can find them

ALTER TABLE public.profiles
  ADD COLUMN first_name text,
  ADD COLUMN last_name text;

-- Update the handle_new_user trigger to extract first/last name from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, first_name, last_name)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'given_name',
    new.raw_user_meta_data->>'family_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
