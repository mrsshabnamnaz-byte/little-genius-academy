-- =====================================================================
-- LITTLE GENIUS ACADEMY — achievements.sql
-- Badges are awarded by the DATABASE, never by the browser, so nobody can
-- give themselves a badge. Run once in the Supabase SQL Editor. Safe to run twice.
-- =====================================================================

-- A few extra badges (existing ones come from seed.sql)
insert into public.achievements (title, description, criteria) values
  ('Picture Pro',   'Finished the picture matching activity!', '{"type":"subject_lessons","subject":"Picture Matching","count":1}'),
  ('Animal Friend', 'Finished 3 animal lessons!',              '{"type":"subject_lessons","subject":"Animal World","count":3}'),
  ('Color Artist',  'Finished 3 colors and shapes lessons!',   '{"type":"subject_lessons","subject":"Colors and Shapes","count":3}')
on conflict (title) do nothing;

-- check_achievements(child): looks at the child's real records, awards any badge
-- whose goal is reached, and returns ONLY the newly earned ones.
create or replace function public.check_achievements(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a      record;
  v_cnt  integer;
  v_need integer;
  v_ok   boolean;
  v_new  jsonb := '[]'::jsonb;
begin
  -- The caller must be the parent of this child.
  if auth.uid() is null or not public.owns_child(p_child_id) then
    raise exception 'Not allowed';
  end if;

  for a in
    select ac.id, ac.title, ac.description, ac.criteria
    from public.achievements ac
    where not exists (
      select 1 from public.child_achievements ca
      where ca.child_id = p_child_id and ca.achievement_id = ac.id
    )
  loop
    v_need := coalesce((a.criteria ->> 'count')::integer, 1);
    v_ok := false;

    if a.criteria ->> 'type' = 'lessons_completed' then
      select count(*) into v_cnt from public.child_progress
       where child_id = p_child_id and status = 'completed';
      v_ok := v_cnt >= v_need;

    elsif a.criteria ->> 'type' = 'subject_lessons' then
      select count(*) into v_cnt
        from public.child_progress cp
        join public.lessons l  on l.id = cp.lesson_id
        join public.subjects s on s.id = l.subject_id
       where cp.child_id = p_child_id and cp.status = 'completed'
         and s.name = a.criteria ->> 'subject';
      v_ok := v_cnt >= v_need;

    elsif a.criteria ->> 'type' = 'games_played' then
      select count(*) into v_cnt from public.game_results where child_id = p_child_id;
      v_ok := v_cnt >= v_need;
    end if;

    if v_ok then
      insert into public.child_achievements (child_id, achievement_id)
      values (p_child_id, a.id)
      on conflict (child_id, achievement_id) do nothing;
      v_new := v_new || jsonb_build_object('title', a.title, 'description', a.description);
    end if;
  end loop;

  return v_new;
end;
$$;

revoke all on function public.check_achievements(uuid) from public, anon;
grant execute on function public.check_achievements(uuid) to authenticated;
