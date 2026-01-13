CREATE INDEX "events_club_id_idx" ON "events" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_start_time_idx" ON "events" USING btree ("event_start_time");