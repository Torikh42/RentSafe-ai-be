CREATE TABLE "inspection_images" (
	"id" text PRIMARY KEY NOT NULL,
	"inspection_id" text NOT NULL,
	"url" text NOT NULL,
	"ai_analysis" text
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"landlord_id" text NOT NULL,
	"type" text NOT NULL,
	"reference_inspection_id" text,
	"comparison_report" text,
	"summary" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "property_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "landlord_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inspection_images" ADD CONSTRAINT "inspection_images_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_landlord_id_users_id_fk" FOREIGN KEY ("landlord_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;