CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "bookings_property_id_idx" ON "bookings" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "bookings_user_id_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_property_id_idx" ON "contracts" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "contracts_tenant_id_idx" ON "contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_landlord_id_idx" ON "contracts" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX "contracts_booking_id_idx" ON "contracts" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "inspection_images_inspection_id_idx" ON "inspection_images" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "inspections_property_id_idx" ON "inspections" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "inspections_landlord_id_idx" ON "inspections" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX "properties_landlord_id_idx" ON "properties" USING btree ("landlord_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");