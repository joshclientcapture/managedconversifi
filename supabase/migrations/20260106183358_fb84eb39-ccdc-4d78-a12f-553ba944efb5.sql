-- Remove the foreign key constraint that's causing the insert failure
ALTER TABLE client_connections 
DROP CONSTRAINT client_connections_ghl_location_id_fkey;