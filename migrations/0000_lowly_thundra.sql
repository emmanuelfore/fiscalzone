CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trading_name" text,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'Zimbabwe',
	"currency" text DEFAULT 'USD',
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"website" text,
	"logo_url" text,
	"tin" text NOT NULL,
	"vat_number" text,
	"bp_number" text,
	"vat_enabled" boolean DEFAULT true,
	"default_payment_terms" text,
	"bank_details" text,
	"fdms_device_id" text,
	"fdms_device_serial_no" text,
	"fdms_api_key" text,
	"zimra_private_key" text,
	"zimra_certificate" text,
	"zimra_environment" text DEFAULT 'test',
	"fiscal_day_open" boolean DEFAULT false,
	"current_fiscal_day_no" integer DEFAULT 0,
	"last_fiscal_day_status" text,
	"invoice_template" text DEFAULT 'modern',
	"primary_color" text DEFAULT '#4f46e5',
	"last_receipt_global_no" integer DEFAULT 0,
	"device_reporting_frequency" integer DEFAULT 1440,
	"last_ping" timestamp,
	"last_fiscal_hash" text,
	"daily_receipt_count" integer DEFAULT 0,
	"branch_name" text,
	"qr_url" text,
	"bank_name" text,
	"account_number" text,
	"account_name" text,
	"branch_code" text,
	"vat_registered" boolean DEFAULT true,
	"email_settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_tin_unique" UNIQUE("tin")
);
--> statement-breakpoint
CREATE TABLE "company_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" integer NOT NULL,
	"role" text DEFAULT 'member'
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"exchange_rate" numeric(10, 6) DEFAULT '1.000000' NOT NULL,
	"is_base" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"mobile" text,
	"address" text,
	"billing_address" text,
	"city" text,
	"country" text DEFAULT 'Zimbabwe',
	"tin" text,
	"vat_number" text,
	"bp_number" text,
	"customer_type" text DEFAULT 'individual',
	"notes" text,
	"is_active" boolean DEFAULT true,
	"currency" text DEFAULT 'USD',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"issue_date" timestamp DEFAULT now(),
	"due_date" timestamp NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"tax_inclusive" boolean DEFAULT false,
	"locked_by" uuid,
	"locked_at" timestamp,
	"fiscal_code" text,
	"fiscal_signature" text,
	"qr_code_data" text,
	"synced_with_fdms" boolean DEFAULT false,
	"fdms_status" text DEFAULT 'pending',
	"submission_id" text,
	"fiscal_day_no" integer,
	"receipt_counter" integer,
	"receipt_global_no" integer,
	"validation_status" text,
	"last_validation_attempt" timestamp,
	"currency" text DEFAULT 'USD',
	"payment_method" text DEFAULT 'CASH',
	"exchange_rate" numeric(10, 6) DEFAULT '1.000000',
	"transaction_type" text DEFAULT 'FiscalInvoice',
	"related_invoice_id" integer,
	"notes" text,
	"invoice_template" text DEFAULT 'modern',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"exchange_rate" numeric(10, 6) DEFAULT '1.000000',
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"payment_method" text NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"barcode" text,
	"hs_code" text DEFAULT '0000.00.00',
	"category" text,
	"price" numeric(10, 2) NOT NULL,
	"cost_price" numeric(10, 2),
	"tax_rate" numeric(5, 2) DEFAULT '15.00',
	"is_tracked" boolean DEFAULT false,
	"stock_level" numeric(10, 2) DEFAULT '0',
	"low_stock_threshold" numeric(10, 2) DEFAULT '10',
	"is_active" boolean DEFAULT true,
	"product_type" text DEFAULT 'good' NOT NULL,
	"tax_category_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"product_id" integer,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"quotation_number" text NOT NULL,
	"issue_date" timestamp DEFAULT now(),
	"expiry_date" timestamp,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"tax_inclusive" boolean DEFAULT false,
	"currency" text DEFAULT 'USD',
	"notes" text,
	"invoice_template" text DEFAULT 'modern',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recurring_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"description" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"tax_inclusive" boolean DEFAULT false,
	"items" jsonb NOT NULL,
	"frequency" text NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"next_run_date" timestamp NOT NULL,
	"last_run_date" timestamp,
	"status" text DEFAULT 'active',
	"auto_send" boolean DEFAULT false,
	"auto_fiscalize" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"default_tax_type_id" integer,
	"zimra_category_code" text,
	"description" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "tax_rate_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"tax_type_id" integer,
	"rate" numeric(5, 2) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"reason" text,
	"gazette_reference" text
);
--> statement-breakpoint
CREATE TABLE "tax_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rate" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"zimra_code" text,
	"zimra_tax_id" text,
	"calculation_method" text DEFAULT 'INCLUSIVE',
	CONSTRAINT "tax_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"name" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "validation_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"error_color" text NOT NULL,
	"requires_previous_receipt" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "zimra_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"invoice_id" integer,
	"endpoint" text,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb NOT NULL,
	"status_code" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tax_category_id_tax_categories_id_fk" FOREIGN KEY ("tax_category_id") REFERENCES "public"."tax_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_categories" ADD CONSTRAINT "tax_categories_default_tax_type_id_tax_types_id_fk" FOREIGN KEY ("default_tax_type_id") REFERENCES "public"."tax_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rate_history" ADD CONSTRAINT "tax_rate_history_tax_type_id_tax_types_id_fk" FOREIGN KEY ("tax_type_id") REFERENCES "public"."tax_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_errors" ADD CONSTRAINT "validation_errors_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zimra_logs" ADD CONSTRAINT "zimra_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zimra_logs" ADD CONSTRAINT "zimra_logs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;