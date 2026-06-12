-- Supabase SQL Editor에 이 파일 전체를 그대로 붙여넣고 실행하세요.
-- 대상 프로젝트 URL: https://pkcirbldvybzjmclgyie.supabase.co
-- 이 SQL은 Vercel 서버리스 API가 service_role 키로 저장/조회하는 구조입니다.
-- 브라우저에서 직접 테이블을 읽거나 쓰지 않도록 RLS를 켜고 공개 정책을 만들지 않습니다.
-- Vercel 환경변수 이름은 SUPABASE_URL, SUPABASE_SECRET_KEY를 사용하세요.

create table if not exists public.clip_popularity_results (
  id bigserial primary key,
  game_key text not null default 'aegyo',
  tournament_id uuid not null,
  clip_key text not null,
  clip_title text not null,
  clip_url text,
  video_path text,
  category text not null default '애교',
  placement integer not null,
  points integer not null,
  created_at timestamptz not null default now(),
  constraint clip_popularity_results_game_key_check
    check (game_key in ('aegyo')),
  constraint clip_popularity_results_placement_check
    check (placement between 1 and 14),
  constraint clip_popularity_results_points_check
    check (points >= 0)
);

create index if not exists clip_popularity_results_game_clip_idx
  on public.clip_popularity_results (game_key, clip_key);

create index if not exists clip_popularity_results_created_at_idx
  on public.clip_popularity_results (created_at desc);

create index if not exists clip_popularity_results_tournament_idx
  on public.clip_popularity_results (tournament_id);

alter table public.clip_popularity_results enable row level security;

create or replace function public.get_clip_popularity_top(
  target_game_key text default 'aegyo',
  limit_count integer default 5
)
returns table (
  clip_key text,
  clip_title text,
  clip_url text,
  video_path text,
  category text,
  total_points bigint,
  play_count bigint,
  champion_count bigint,
  average_placement numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.clip_key,
    max(r.clip_title) as clip_title,
    max(r.clip_url) as clip_url,
    max(r.video_path) as video_path,
    max(r.category) as category,
    sum(r.points)::bigint as total_points,
    count(r.id)::bigint as play_count,
    count(r.id) filter (where r.placement = 1)::bigint as champion_count,
    round(avg(r.placement)::numeric, 2) as average_placement
  from public.clip_popularity_results r
  where r.game_key = target_game_key
  group by r.clip_key
  order by
    sum(r.points) desc,
    count(r.id) filter (where r.placement = 1) desc,
    avg(r.placement) asc,
    max(r.clip_title) asc
  limit greatest(1, least(limit_count, 20));
$$;

revoke all on function public.get_clip_popularity_top(text, integer) from public;
grant execute on function public.get_clip_popularity_top(text, integer) to service_role;
