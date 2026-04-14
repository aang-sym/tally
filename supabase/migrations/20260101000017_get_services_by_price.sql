drop function if exists public.get_streaming_services_with_price(text);

create or replace function public.get_streaming_services_with_price(country_code text)
returns table (
  id uuid,
  name text,
  logo_path text,
  homepage text,
  tmdb_provider_id integer,
  prices jsonb,         -- array of tiers for the country
  default_price jsonb   -- first active price (e.g., Standard) for convenience
)
language sql
stable
as $$
  with svc as (
    select
      ss.id,
      ss.name,
      case 
        when ss.logo_path is null then null
        when ss.logo_path ilike 'http%' then ss.logo_path
        else 'https://image.tmdb.org/t/p/w45' || ss.logo_path
      end as logo_path,
      ss.homepage,
      ss.tmdb_provider_id
    from public.streaming_services ss
  ),
  tiered as (
    select
      s.*,
      jsonb_build_object(
        'tier', coalesce(p.tier, 'Standard'),
        'amount', p.monthly_cost,
        'currency', p.currency,
        'billing_frequency', coalesce(p.billing_frequency, 'monthly'),
        'active', coalesce(p.active, true),
        'notes', p.notes,
        'provider_name', coalesce(p.provider_name, s.name)
      ) as tier_obj,
      coalesce(p.active, true) as is_active,
      case 
        when p.tier ilike 'standard%' then 1
        when p.tier ilike '%no ads%'  then 2
        when p.tier ilike '%ads%'     then 3
        when p.tier ilike '%premium%' then 4
        else 9
      end as tier_rank
    from svc s
    left join public.streaming_service_prices p
      on p.service_id = s.id
     and upper(p.country_code) = upper(country_code)
  )
  select
    t.id,
    t.name,
    t.logo_path,
    t.homepage,
    t.tmdb_provider_id,
    -- array of all active or defined tiers
    coalesce(
      jsonb_agg(t.tier_obj order by t.tier_rank, t.name) filter (where t.tier_obj is not null),
      '[]'::jsonb
    ) as prices,
    -- pick the first active tier as default (Standard if present)
    (
      select x.tier_obj
      from tiered x
      where x.id = t.id
        and x.tier_obj is not null
        and x.is_active = true
      order by x.tier_rank
      limit 1
    ) as default_price
  from tiered t
  group by t.id, t.name, t.logo_path, t.homepage, t.tmdb_provider_id
  order by t.name;
$$;