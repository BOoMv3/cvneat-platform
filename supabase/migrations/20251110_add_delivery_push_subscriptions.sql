create table if not exists delivery_push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamp without time zone default timezone('utc'::text, now())
);

create index if not exists delivery_push_subscriptions_user_idx on delivery_push_subscriptions(user_id);


