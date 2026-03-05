create or replace view public.posts_daily_stats as
select
  user_id,
  cast(created_at as date) as day,
  count(*) as post_count
from public.posts
group by user_id, cast(created_at as date)
order by user_id, day;

