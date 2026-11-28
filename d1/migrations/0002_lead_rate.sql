CREATE INDEX IF NOT EXISTS website_leads_rate ON website_leads(json_extract(payload_json,'$.phone'),received_at);
