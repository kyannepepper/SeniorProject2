-- Fix: cast move_in_date from text to date so it matches applications.move_in_date column type.
-- Run this in Supabase SQL Editor.

create or replace function public.submit_application(
  p_property_id uuid,
  p_name text,
  p_email text,
  p_phone text default null,
  p_move_in_date text default null,
  p_description text default null,
  p_references jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application_id uuid;
  ref jsonb;
  v_move_in_date date;
begin
  -- Cast text to date when non-empty (expects YYYY-MM-DD)
  v_move_in_date := case
    when nullif(trim(coalesce(p_move_in_date, '')), '') is not null
    then (nullif(trim(coalesce(p_move_in_date, '')), ''))::date
    else null
  end;

  insert into applications (property_id, name, email, phone, move_in_date, description)
  values (
    p_property_id,
    p_name,
    p_email,
    nullif(trim(coalesce(p_phone, '')), ''),
    v_move_in_date,
    nullif(trim(coalesce(p_description, '')), '')
  )
  returning application_id into v_application_id;

  for ref in select * from jsonb_array_elements(p_references)
  loop
    if ref->>'name' is not null and trim(coalesce(ref->>'name', '')) <> '' then
      insert into applicant_references (application_id, name, phone, email, relationship)
      values (
        v_application_id,
        trim(ref->>'name'),
        nullif(trim(coalesce(ref->>'phone', '')), ''),
        nullif(trim(coalesce(ref->>'email', '')), ''),
        nullif(trim(coalesce(ref->>'relationship', '')), '')
      );
    end if;
  end loop;

  return v_application_id;
end;
$$;

grant execute on function public.submit_application(uuid, text, text, text, text, text, jsonb) to anon;
grant execute on function public.submit_application(uuid, text, text, text, text, text, jsonb) to authenticated;
