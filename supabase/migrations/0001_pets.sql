create table public.pets (
  slug           text primary key,
  edit_token     text not null,
  created_at     timestamptz not null default now(),
  name           text not null,
  species        text,
  breed          text,
  age            text,
  photo_url      text,
  medical_notes  text,
  owner_name     text not null,
  owner_phone    text not null,
  owner_note     text
);
