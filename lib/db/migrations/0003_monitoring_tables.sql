-- Enums
DO $$ BEGIN
  CREATE TYPE device_type AS ENUM ('server', 'switch', 'router', 'firewall', 'ap');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE device_status AS ENUM ('up', 'down', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  host                 TEXT NOT NULL,
  port                 INTEGER NOT NULL DEFAULT 80,
  type                 device_type NOT NULL,
  status               device_status NOT NULL DEFAULT 'unknown',
  check_interval_sec   INTEGER NOT NULL DEFAULT 60,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_checked_at      TIMESTAMP,
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT devices_host_port_unique UNIQUE (host, port)
);

-- Device status log
CREATE TABLE IF NOT EXISTS device_status_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status      device_status NOT NULL,
  latency_ms  INTEGER,
  error       TEXT,
  checked_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  first_seen   TIMESTAMP NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMP,
  last_error   TEXT
);
