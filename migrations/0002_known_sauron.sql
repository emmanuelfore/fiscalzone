CREATE TABLE "product_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"variation_id" integer,
	"batch_number" text NOT NULL,
	"expiry_date" date NOT NULL,
	"stock_level" numeric(10, 2) DEFAULT '0',
	"cost_price" numeric(10, 2),
	"is_expired" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_variations" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"barcode" text,
	"price" numeric(10, 2) NOT NULL,
	"stock_level" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_product_id" integer NOT NULL,
	"ingredient_product_id" integer NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"table_number" text NOT NULL,
	"capacity" integer DEFAULT 2,
	"status" text DEFAULT 'free',
	"pos_x" integer DEFAULT 0,
	"pos_y" integer DEFAULT 0,
	"width" integer DEFAULT 60,
	"height" integer DEFAULT 60,
	"shape" text DEFAULT 'square',
	"current_invoice_id" integer
);
--> statement-breakpoint
CREATE TABLE "stock_take_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_take_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"system_count" numeric(10, 2) NOT NULL,
	"physical_count" numeric(10, 2),
	"unit_cost" numeric(10, 2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stock_takes" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "restaurant_settings" jsonb;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "pharmacy_settings" jsonb;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "modifiers" jsonb;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "batch_id" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "variation_id" integer;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "expiry_date" date;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "batch_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "table_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "waiter_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "covers" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "dining_option" text DEFAULT 'dine_in';--> statement-breakpoint
ALTER TABLE "pos_shift_transactions" ADD COLUMN "authorized_by" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_of_measure" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_ingredient" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_recipe" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_prescription_only" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "batch_tracking_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "generic_name" text;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_parent_product_id_products_id_fk" FOREIGN KEY ("parent_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_product_id_products_id_fk" FOREIGN KEY ("ingredient_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_sections" ADD CONSTRAINT "restaurant_sections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_section_id_restaurant_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."restaurant_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_batches_product_id_idx" ON "product_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_batches_number_idx" ON "product_batches" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "stock_take_items_stock_take_id_idx" ON "stock_take_items" USING btree ("stock_take_id");--> statement-breakpoint
CREATE INDEX "stock_takes_company_id_idx" ON "stock_takes" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_shift_transactions" ADD CONSTRAINT "pos_shift_transactions_authorized_by_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;