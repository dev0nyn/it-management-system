CREATE TYPE "public"."asset_status" AS ENUM('in_stock', 'assigned', 'repair', 'retired');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('laptop', 'monitor', 'phone', 'server', 'printer', 'network', 'peripheral');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag" text NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"serial" text NOT NULL,
	"status" "asset_status" DEFAULT 'in_stock' NOT NULL,
	"assigned_to" uuid,
	"purchase_date" date,
	"warranty_expiry" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assets_tag_unique" UNIQUE("tag")
);--> statement-breakpoint
CREATE TABLE "asset_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"unassigned_at" timestamp
);--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
