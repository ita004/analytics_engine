-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for Google OAuth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    app_domain VARCHAR(255),
    api_key VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Events table (partitioned by date for performance)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    url TEXT,
    referrer TEXT,
    device VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    browser VARCHAR(100),
    os VARCHAR(100),
    screen_size VARCHAR(50),
    user_id VARCHAR(255),
    metadata JSONB,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_events_api_key_id ON events(api_key_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_device ON events(device);
CREATE INDEX IF NOT EXISTS idx_events_composite ON events(api_key_id, event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create a GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_events_metadata ON events USING GIN (metadata);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active API keys
CREATE OR REPLACE VIEW active_api_keys AS
SELECT
    ak.*,
    u.email as user_email,
    u.name as user_name
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
WHERE ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP);

-- Create materialized view for event summary (for faster aggregations)
CREATE MATERIALIZED VIEW IF NOT EXISTS event_summary_cache AS
SELECT
    api_key_id,
    event_name,
    DATE(timestamp) as event_date,
    device,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM events
GROUP BY api_key_id, event_name, DATE(timestamp), device;

CREATE INDEX IF NOT EXISTS idx_event_summary_cache ON event_summary_cache(api_key_id, event_name, event_date);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_event_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY event_summary_cache;
END;
$$ LANGUAGE plpgsql;
