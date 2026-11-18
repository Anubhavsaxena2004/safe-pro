-- Kiddough Baby Proof: database schema.
-- Safe to run repeatedly: every statement is idempotent.
-- Runs automatically on every Vercel build (npm run build) and via `npm run db:migrate`.

create table if not exists admins (
  id            serial primary key,
  name          text not null default 'Admin',
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists cities (
  id     serial primary key,
  name   text not null unique,
  active boolean not null default true
);

create table if not exists services (
  id          serial primary key,
  name        text not null,
  description text not null default '',
  price       integer not null default 0,      -- what the customer pays, in rupees
  pro_payout  integer not null default 0,      -- what the Safe Pro earns, in rupees
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Safe Pros (field agents)
create table if not exists pros (
  id               serial primary key,
  name             text not null,
  phone            text not null unique,
  password_hash    text,                       -- unused since OTP login; kept for older rows
  city             text not null,
  pincode          text not null default '',
  address          text not null default '',
  experience_years integer not null default 0,
  about            text not null default '',
  id_type          text not null default '',
  id_last4         text not null default '',   -- only the last 4 digits are stored
  id_doc_url       text,
  status           text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected', 'suspended')),
  status_note      text not null default '',
  is_online        boolean not null default false,
  last_lat         double precision,
  last_lng         double precision,
  last_seen_at     timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists bookings (
  id              serial primary key,
  ref             text not null unique,
  service_id      integer not null references services(id),
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text not null default '',
  address         text not null,
  city            text not null,
  pincode         text not null,
  preferred_date  date not null,
  preferred_slot  text not null,
  notes           text not null default '',
  source          text not null default 'web',  -- web | admin
  status          text not null default 'requested'
                  check (status in ('requested', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled')),
  pro_id          integer references pros(id),
  rejected_by     integer[] not null default '{}',
  price           integer not null default 0,
  pro_payout      integer not null default 0,
  payout_status   text not null default 'unpaid' check (payout_status in ('unpaid', 'paid')),
  completion_code text not null,                 -- customer shares this with the Safe Pro to confirm completion
  checkin_at      timestamptz,
  checkin_lat     double precision,
  checkin_lng     double precision,
  completed_at    timestamptz,
  checkout_lat    double precision,
  checkout_lng    double precision,
  pro_notes       text not null default '',
  rating          integer check (rating between 1 and 5),
  feedback        text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_pro_idx on bookings (pro_id);
create index if not exists bookings_date_idx on bookings (preferred_date);

create table if not exists booking_photos (
  id         serial primary key,
  booking_id integer not null references bookings(id) on delete cascade,
  kind       text not null check (kind in ('before', 'after')),
  url        text not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_photos_booking_idx on booking_photos (booking_id);

create table if not exists booking_events (
  id         serial primary key,
  booking_id integer not null references bookings(id) on delete cascade,
  actor      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking_idx on booking_events (booking_id);

-- One-time codes for mobile-number login/verification and Aadhaar verification.
-- Codes are stored only as keyed hashes.
create table if not exists otp_requests (
  id          serial primary key,
  purpose     text not null,              -- pro_login | pro_register | booking | aadhaar
  target      text not null,              -- mobile number, or a keyed hash for Aadhaar
  code_hash   text not null,
  attempts    integer not null default 0,
  expires_at  timestamptz not null,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists otp_requests_target_idx on otp_requests (target, created_at desc);

-- Upgrades for databases created before OTP / Aadhaar verification existed.
alter table pros alter column password_hash drop not null;
alter table pros add column if not exists aadhaar_verified boolean not null default false;
alter table pros add column if not exists aadhaar_verified_at timestamptz;
alter table pros add column if not exists kyc_mode text not null default '';         -- demo | live
alter table bookings add column if not exists phone_verified boolean not null default false;

-- Starter data: only inserted when the table is empty. Edit prices in Admin → Settings.
insert into services (name, description, price, pro_payout, sort_order)
select * from (values
  ('Home Safety Check', 'A Safe Pro visits, checks every room for child-safety risks and recommends products.', 499, 250, 1),
  ('Baby-Proofing Installation', 'Installation of safety gates, bed rails, corner guards, cabinet locks and more.', 999, 500, 2),
  ('Servicing & Repair', 'Check-up, adjustment or repair of safety products that are already installed.', 399, 200, 3)
) as v (name, description, price, pro_payout, sort_order)
where not exists (select 1 from services);

insert into cities (name)
select * from (values ('Mumbai'), ('Delhi NCR'), ('Bengaluru')) as v (name)
where not exists (select 1 from cities);
