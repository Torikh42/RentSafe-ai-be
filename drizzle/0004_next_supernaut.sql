CREATE TABLE "escrows" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"amount" integer NOT NULL,
	"fee" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"midtrans_order_id" text,
	"payment_url" text,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"escrow_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"midtrans_transaction_id" text,
	"payment_method" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "escrows_contract_id_idx" ON "escrows" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "escrows_midtrans_order_id_idx" ON "escrows" USING btree ("midtrans_order_id");--> statement-breakpoint
CREATE INDEX "payments_escrow_id_idx" ON "payments" USING btree ("escrow_id");