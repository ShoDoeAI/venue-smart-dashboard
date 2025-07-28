create table "public"."action_log" (
    "id" uuid not null default uuid_generate_v4(),
    "timestamp" timestamp with time zone default now(),
    "platform" text not null,
    "action_type" text not null,
    "parameters" jsonb,
    "status" text,
    "executed_at" timestamp with time zone,
    "executed_by" text,
    "result" jsonb,
    "error_message" text,
    "confirmation_required" boolean default true,
    "confirmed_at" timestamp with time zone,
    "rollback_data" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."action_log" enable row level security;

create table "public"."api_credentials" (
    "id" uuid not null default uuid_generate_v4(),
    "service" text not null,
    "credentials" jsonb not null,
    "is_active" boolean default true,
    "last_successful_fetch" timestamp with time zone,
    "last_error" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."api_credentials" enable row level security;

create table "public"."api_sync_status" (
    "id" uuid not null default uuid_generate_v4(),
    "venue_id" uuid,
    "service" text not null,
    "last_sync_at" timestamp with time zone,
    "last_successful_sync_at" timestamp with time zone,
    "last_error" text,
    "is_syncing" boolean default false,
    "sync_frequency_minutes" integer default 180,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."chat_history" (
    "id" uuid not null default uuid_generate_v4(),
    "session_id" uuid,
    "timestamp" timestamp with time zone default now(),
    "role" text not null,
    "content" text not null,
    "snapshot_timestamp" timestamp with time zone,
    "context_data" jsonb,
    "recommendations" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."chat_history" enable row level security;

create table "public"."cron_logs" (
    "id" uuid not null default uuid_generate_v4(),
    "job_name" text not null,
    "status" text not null,
    "duration_ms" integer,
    "metadata" jsonb,
    "error_message" text,
    "executed_at" timestamp with time zone not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."daily_summaries" (
    "id" uuid not null default uuid_generate_v4(),
    "date" date not null,
    "total_events" integer,
    "total_tickets_sold" integer,
    "total_capacity" integer,
    "average_sell_through" numeric(5,2),
    "gross_ticket_revenue" numeric(10,2),
    "total_bar_revenue" numeric(10,2),
    "total_food_revenue" numeric(10,2),
    "total_revenue" numeric(10,2),
    "transaction_count" integer,
    "average_transaction" numeric(10,2),
    "low_stock_items" integer,
    "critical_stock_items" integer,
    "average_variance" numeric(5,2),
    "inventory_value" numeric(10,2),
    "total_reservations" integer,
    "total_covers" integer,
    "no_show_count" integer,
    "average_party_size" numeric(3,1),
    "emails_sent" integer,
    "email_open_rate" numeric(5,2),
    "email_click_rate" numeric(5,2),
    "marketing_attributed_revenue" numeric(10,2),
    "social_reach" integer,
    "social_engagement" integer,
    "ad_spend" numeric(10,2),
    "ad_revenue" numeric(10,2),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."daily_summaries" enable row level security;

create table "public"."eventbrite_attendees" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null,
    "event_id" text not null,
    "attendee_id" text not null,
    "order_id" text not null,
    "created" timestamp with time zone,
    "changed" timestamp with time zone,
    "ticket_class_id" text,
    "ticket_class_name" text,
    "status" text,
    "checked_in" boolean default false,
    "refunded" boolean default false,
    "first_name" text,
    "last_name" text,
    "email" text,
    "quantity" integer,
    "costs" jsonb,
    "barcode" text,
    "affiliate" text,
    "answers" jsonb,
    "promotional_code" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."eventbrite_attendees" enable row level security;

create table "public"."eventbrite_events" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null,
    "event_id" text not null,
    "name" text not null,
    "description" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone,
    "created" timestamp with time zone,
    "changed" timestamp with time zone,
    "published" timestamp with time zone,
    "status" text,
    "currency" text,
    "online_event" boolean,
    "listed" boolean,
    "shareable" boolean,
    "invite_only" boolean,
    "capacity" integer,
    "capacity_is_custom" boolean,
    "venue_id" text,
    "venue_name" text,
    "venue_address" jsonb,
    "organizer_id" text,
    "organizer_name" text,
    "category_id" text,
    "subcategory_id" text,
    "format_id" text,
    "tickets_sold" integer default 0,
    "tickets_available" integer,
    "total_revenue" numeric(10,2),
    "ticket_classes" jsonb,
    "promotional_codes" jsonb,
    "sell_through_rate" numeric(5,2) generated always as (
CASE
    WHEN (capacity > 0) THEN (((tickets_sold)::numeric / (capacity)::numeric) * (100)::numeric)
    ELSE (0)::numeric
END) stored,
    "created_at" timestamp with time zone default now()
);


alter table "public"."eventbrite_events" enable row level security;

create table "public"."square_catalog_items" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null,
    "item_id" text not null,
    "version" bigint,
    "name" text not null,
    "description" text,
    "category_id" text,
    "category_name" text,
    "price_amount" integer,
    "price_currency" text default 'USD'::text,
    "track_inventory" boolean default false,
    "available_online" boolean default true,
    "available_for_pickup" boolean default true,
    "modifier_list_info" jsonb,
    "variations" jsonb,
    "tax_ids" jsonb,
    "reporting_category" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."square_catalog_items" enable row level security;

create table "public"."square_transactions" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null,
    "transaction_id" text not null,
    "location_id" text not null,
    "created_at" timestamp with time zone not null,
    "total_amount" integer not null,
    "tax_amount" integer default 0,
    "tip_amount" integer default 0,
    "discount_amount" integer default 0,
    "service_charge_amount" integer default 0,
    "source_type" text,
    "status" text,
    "receipt_number" text,
    "receipt_url" text,
    "customer_id" text,
    "customer_name" text,
    "customer_email" text,
    "team_member_id" text,
    "device_id" text,
    "item_count" integer,
    "unique_item_count" integer,
    "itemizations" jsonb,
    "payment_details" jsonb,
    "refunds" jsonb,
    "created_at_db" timestamp with time zone default now()
);


alter table "public"."square_transactions" enable row level security;

create table "public"."toast_checks" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null default now(),
    "check_guid" text not null,
    "order_guid" text not null,
    "tab_name" text,
    "amount" integer default 0,
    "tax_amount" integer default 0,
    "tip_amount" integer default 0,
    "total_amount" integer default 0,
    "applied_discount_amount" integer default 0,
    "created_date" timestamp with time zone,
    "opened_date" timestamp with time zone,
    "closed_date" timestamp with time zone,
    "voided" boolean default false,
    "void_date" timestamp with time zone,
    "payment_status" text,
    "customer_guid" text,
    "customer_first_name" text,
    "customer_last_name" text,
    "customer_phone" text,
    "customer_email" text,
    "customer_company_name" text,
    "applied_service_charges" jsonb,
    "applied_discounts" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."toast_checks" enable row level security;

create table "public"."toast_employees" (
    "id" uuid not null default uuid_generate_v4(),
    "employee_guid" text not null,
    "external_id" text,
    "first_name" text,
    "last_name" text,
    "email" text,
    "phone" text,
    "hire_date" date,
    "termination_date" date,
    "is_active" boolean default true,
    "job_roles" jsonb,
    "wage_info" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."toast_employees" enable row level security;

create table "public"."toast_menu_items" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null default now(),
    "item_guid" text not null,
    "external_id" text,
    "name" text not null,
    "description" text,
    "sku" text,
    "menu_group_guid" text,
    "menu_group_name" text,
    "sales_category_guid" text,
    "sales_category_name" text,
    "base_price" integer,
    "is_available" boolean default true,
    "visibility" text[],
    "option_groups" jsonb,
    "images" jsonb,
    "allergen_info" jsonb,
    "nutritional_info" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."toast_menu_items" enable row level security;

create table "public"."toast_orders" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null default now(),
    "order_guid" text not null,
    "external_id" text,
    "display_number" integer,
    "order_number" text,
    "source" text,
    "business_date" integer,
    "revenue_center_guid" text,
    "revenue_center_name" text,
    "created_date" timestamp with time zone not null,
    "modified_date" timestamp with time zone,
    "opened_date" timestamp with time zone,
    "closed_date" timestamp with time zone,
    "paid_date" timestamp with time zone,
    "deleted_date" timestamp with time zone,
    "voided" boolean default false,
    "void_date" timestamp with time zone,
    "void_business_date" integer,
    "approval_status" text,
    "guest_count" integer,
    "dining_option_guid" text,
    "dining_option_name" text,
    "server_guid" text,
    "server_first_name" text,
    "server_last_name" text,
    "server_external_id" text,
    "location_id" text not null,
    "delivery_info" jsonb,
    "curbside_pickup_info" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."toast_orders" enable row level security;

create table "public"."toast_payments" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null default now(),
    "payment_guid" text not null,
    "check_guid" text not null,
    "order_guid" text not null,
    "amount" integer not null,
    "tip_amount" integer default 0,
    "amount_tendered" integer,
    "type" text,
    "card_type" text,
    "last_4_digits" text,
    "external_payment_guid" text,
    "paid_date" timestamp with time zone,
    "paid_business_date" integer,
    "house" boolean default false,
    "refund_status" text,
    "voided" boolean default false,
    "void_date" timestamp with time zone,
    "void_user_guid" text,
    "void_user_name" text,
    "refund" jsonb,
    "mca_repayment_amount" integer,
    "created_at" timestamp with time zone default now()
);


alter table "public"."toast_payments" enable row level security;

create table "public"."toast_restaurant_info" (
    "id" uuid not null default uuid_generate_v4(),
    "restaurant_guid" text not null,
    "location_guid" text not null,
    "name" text not null,
    "location_name" text,
    "address1" text,
    "address2" text,
    "city" text,
    "state" text,
    "zip" text,
    "country" text,
    "phone" text,
    "website" text,
    "hours_of_operation" jsonb,
    "timezone" text default 'America/Los_Angeles'::text,
    "currency" text default 'USD'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."toast_restaurant_info" enable row level security;

create table "public"."toast_selections" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null default now(),
    "selection_guid" text not null,
    "check_guid" text not null,
    "order_guid" text not null,
    "item_guid" text not null,
    "item_name" text not null,
    "item_group_guid" text,
    "item_group_name" text,
    "quantity" numeric(10,3) not null,
    "price" integer,
    "tax" integer,
    "pre_discount_price" integer,
    "receipt_line_price" integer,
    "display_name" text,
    "selection_type" text,
    "sales_category_guid" text,
    "sales_category_name" text,
    "voided" boolean default false,
    "void_date" timestamp with time zone,
    "void_business_date" integer,
    "void_reason_guid" text,
    "void_reason_name" text,
    "fulfillment_status" text,
    "deferred_price" integer,
    "modifiers" jsonb,
    "applied_discounts" jsonb,
    "refund_details" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."toast_selections" enable row level security;

create table "public"."venue_config" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "timezone" text default 'America/Los_Angeles'::text,
    "settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."venue_config" enable row level security;

create table "public"."venue_snapshots" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null default now(),
    "eventbrite_fetched" boolean default false,
    "square_fetched" boolean default false,
    "wisk_fetched" boolean default false,
    "resy_fetched" boolean default false,
    "audience_republic_fetched" boolean default false,
    "meta_fetched" boolean default false,
    "opentable_fetched" boolean default false,
    "kpis" jsonb,
    "alerts" jsonb,
    "fetch_duration_ms" integer,
    "errors" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."venue_snapshots" enable row level security;

create table "public"."venues" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "timezone" text default 'America/Los_Angeles'::text,
    "settings" jsonb default '{}'::jsonb,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."wisk_inventory" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null,
    "item_id" text not null,
    "name" text not null,
    "category" text,
    "subcategory" text,
    "supplier" text,
    "brand" text,
    "current_stock" numeric(10,3),
    "unit_of_measure" text,
    "container_size" numeric(10,3),
    "containers_in_stock" numeric(10,3),
    "par_level" numeric(10,3),
    "critical_level" numeric(10,3),
    "is_below_par" boolean,
    "is_critical" boolean,
    "unit_cost" numeric(10,2),
    "total_value" numeric(10,2),
    "last_purchase_price" numeric(10,2),
    "average_cost" numeric(10,2),
    "usage_last_period" numeric(10,3),
    "variance_amount" numeric(10,3),
    "variance_percentage" numeric(5,2),
    "locations" jsonb,
    "recent_counts" jsonb,
    "purchase_history" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."wisk_inventory" enable row level security;

create table "public"."wisk_recipes" (
    "id" uuid not null default uuid_generate_v4(),
    "snapshot_timestamp" timestamp with time zone not null,
    "recipe_id" text not null,
    "pos_item_id" text,
    "name" text not null,
    "category" text,
    "selling_price" numeric(10,2),
    "total_cost" numeric(10,2),
    "cost_percentage" numeric(5,2),
    "profit_margin" numeric(5,2),
    "ingredients" jsonb,
    "quantity_sold_period" integer,
    "revenue_period" numeric(10,2),
    "created_at" timestamp with time zone default now()
);


alter table "public"."wisk_recipes" enable row level security;

CREATE UNIQUE INDEX action_log_pkey ON public.action_log USING btree (id);

CREATE UNIQUE INDEX api_credentials_pkey ON public.api_credentials USING btree (id);

CREATE UNIQUE INDEX api_credentials_service_key ON public.api_credentials USING btree (service);

CREATE UNIQUE INDEX api_sync_status_pkey ON public.api_sync_status USING btree (id);

CREATE UNIQUE INDEX api_sync_status_venue_id_service_key ON public.api_sync_status USING btree (venue_id, service);

CREATE UNIQUE INDEX chat_history_pkey ON public.chat_history USING btree (id);

CREATE UNIQUE INDEX cron_logs_pkey ON public.cron_logs USING btree (id);

CREATE UNIQUE INDEX daily_summaries_date_key ON public.daily_summaries USING btree (date);

CREATE UNIQUE INDEX daily_summaries_pkey ON public.daily_summaries USING btree (id);

CREATE UNIQUE INDEX eventbrite_attendees_pkey ON public.eventbrite_attendees USING btree (id);

CREATE UNIQUE INDEX eventbrite_events_pkey ON public.eventbrite_events USING btree (id);

CREATE INDEX idx_action_status ON public.action_log USING btree (status, "timestamp" DESC);

CREATE INDEX idx_action_timestamp ON public.action_log USING btree ("timestamp" DESC);

CREATE INDEX idx_attendee_checkin ON public.eventbrite_attendees USING btree (event_id, checked_in);

CREATE INDEX idx_attendee_event ON public.eventbrite_attendees USING btree (event_id, snapshot_timestamp DESC);

CREATE INDEX idx_attendee_snapshot ON public.eventbrite_attendees USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_catalog_item ON public.square_catalog_items USING btree (item_id, snapshot_timestamp DESC);

CREATE INDEX idx_catalog_snapshot ON public.square_catalog_items USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_chat_session ON public.chat_history USING btree (session_id, "timestamp" DESC);

CREATE INDEX idx_daily_date ON public.daily_summaries USING btree (date DESC);

CREATE INDEX idx_eventbrite_dates ON public.eventbrite_events USING btree (start_time, end_time);

CREATE INDEX idx_eventbrite_event ON public.eventbrite_events USING btree (event_id, snapshot_timestamp DESC);

CREATE INDEX idx_eventbrite_snapshot ON public.eventbrite_events USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_recipe_margin ON public.wisk_recipes USING btree (profit_margin, snapshot_timestamp DESC);

CREATE INDEX idx_recipe_snapshot ON public.wisk_recipes USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_snapshot_timestamp ON public.venue_snapshots USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_square_created ON public.square_transactions USING btree (created_at DESC);

CREATE INDEX idx_square_location ON public.square_transactions USING btree (location_id, created_at DESC);

CREATE INDEX idx_square_snapshot ON public.square_transactions USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_toast_checks_customer ON public.toast_checks USING btree (customer_email);

CREATE INDEX idx_toast_checks_guid ON public.toast_checks USING btree (check_guid);

CREATE INDEX idx_toast_checks_order ON public.toast_checks USING btree (order_guid);

CREATE INDEX idx_toast_checks_snapshot ON public.toast_checks USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_toast_menu_items_group ON public.toast_menu_items USING btree (menu_group_guid);

CREATE INDEX idx_toast_menu_items_guid ON public.toast_menu_items USING btree (item_guid);

CREATE INDEX idx_toast_menu_items_snapshot ON public.toast_menu_items USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_toast_orders_business_date ON public.toast_orders USING btree (business_date DESC);

CREATE INDEX idx_toast_orders_date ON public.toast_orders USING btree (created_date DESC);

CREATE INDEX idx_toast_orders_guid ON public.toast_orders USING btree (order_guid);

CREATE INDEX idx_toast_orders_location ON public.toast_orders USING btree (location_id, created_date DESC);

CREATE INDEX idx_toast_orders_snapshot ON public.toast_orders USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_toast_payments_check ON public.toast_payments USING btree (check_guid);

CREATE INDEX idx_toast_payments_date ON public.toast_payments USING btree (paid_date DESC);

CREATE INDEX idx_toast_payments_guid ON public.toast_payments USING btree (payment_guid);

CREATE INDEX idx_toast_payments_order ON public.toast_payments USING btree (order_guid);

CREATE INDEX idx_toast_payments_snapshot ON public.toast_payments USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_toast_payments_type ON public.toast_payments USING btree (type);

CREATE INDEX idx_toast_selections_check ON public.toast_selections USING btree (check_guid);

CREATE INDEX idx_toast_selections_guid ON public.toast_selections USING btree (selection_guid);

CREATE INDEX idx_toast_selections_item ON public.toast_selections USING btree (item_guid);

CREATE INDEX idx_toast_selections_snapshot ON public.toast_selections USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_wisk_critical ON public.wisk_inventory USING btree (is_critical, snapshot_timestamp DESC);

CREATE INDEX idx_wisk_snapshot ON public.wisk_inventory USING btree (snapshot_timestamp DESC);

CREATE INDEX idx_wisk_variance ON public.wisk_inventory USING btree (variance_percentage, snapshot_timestamp DESC);

CREATE UNIQUE INDEX square_catalog_items_pkey ON public.square_catalog_items USING btree (id);

CREATE UNIQUE INDEX square_transactions_pkey ON public.square_transactions USING btree (id);

CREATE UNIQUE INDEX toast_checks_check_guid_snapshot_timestamp_key ON public.toast_checks USING btree (check_guid, snapshot_timestamp);

CREATE UNIQUE INDEX toast_checks_pkey ON public.toast_checks USING btree (id);

CREATE UNIQUE INDEX toast_employees_employee_guid_key ON public.toast_employees USING btree (employee_guid);

CREATE UNIQUE INDEX toast_employees_pkey ON public.toast_employees USING btree (id);

CREATE UNIQUE INDEX toast_menu_items_item_guid_snapshot_timestamp_key ON public.toast_menu_items USING btree (item_guid, snapshot_timestamp);

CREATE UNIQUE INDEX toast_menu_items_pkey ON public.toast_menu_items USING btree (id);

CREATE UNIQUE INDEX toast_orders_order_guid_snapshot_timestamp_key ON public.toast_orders USING btree (order_guid, snapshot_timestamp);

CREATE UNIQUE INDEX toast_orders_pkey ON public.toast_orders USING btree (id);

CREATE UNIQUE INDEX toast_payments_payment_guid_snapshot_timestamp_key ON public.toast_payments USING btree (payment_guid, snapshot_timestamp);

CREATE UNIQUE INDEX toast_payments_pkey ON public.toast_payments USING btree (id);

CREATE UNIQUE INDEX toast_restaurant_info_location_guid_key ON public.toast_restaurant_info USING btree (location_guid);

CREATE UNIQUE INDEX toast_restaurant_info_pkey ON public.toast_restaurant_info USING btree (id);

CREATE UNIQUE INDEX toast_selections_pkey ON public.toast_selections USING btree (id);

CREATE UNIQUE INDEX toast_selections_selection_guid_snapshot_timestamp_key ON public.toast_selections USING btree (selection_guid, snapshot_timestamp);

CREATE UNIQUE INDEX venue_config_pkey ON public.venue_config USING btree (id);

CREATE UNIQUE INDEX venue_snapshots_pkey ON public.venue_snapshots USING btree (id);

CREATE UNIQUE INDEX venues_pkey ON public.venues USING btree (id);

CREATE UNIQUE INDEX wisk_inventory_pkey ON public.wisk_inventory USING btree (id);

CREATE UNIQUE INDEX wisk_recipes_pkey ON public.wisk_recipes USING btree (id);

alter table "public"."action_log" add constraint "action_log_pkey" PRIMARY KEY using index "action_log_pkey";

alter table "public"."api_credentials" add constraint "api_credentials_pkey" PRIMARY KEY using index "api_credentials_pkey";

alter table "public"."api_sync_status" add constraint "api_sync_status_pkey" PRIMARY KEY using index "api_sync_status_pkey";

alter table "public"."chat_history" add constraint "chat_history_pkey" PRIMARY KEY using index "chat_history_pkey";

alter table "public"."cron_logs" add constraint "cron_logs_pkey" PRIMARY KEY using index "cron_logs_pkey";

alter table "public"."daily_summaries" add constraint "daily_summaries_pkey" PRIMARY KEY using index "daily_summaries_pkey";

alter table "public"."eventbrite_attendees" add constraint "eventbrite_attendees_pkey" PRIMARY KEY using index "eventbrite_attendees_pkey";

alter table "public"."eventbrite_events" add constraint "eventbrite_events_pkey" PRIMARY KEY using index "eventbrite_events_pkey";

alter table "public"."square_catalog_items" add constraint "square_catalog_items_pkey" PRIMARY KEY using index "square_catalog_items_pkey";

alter table "public"."square_transactions" add constraint "square_transactions_pkey" PRIMARY KEY using index "square_transactions_pkey";

alter table "public"."toast_checks" add constraint "toast_checks_pkey" PRIMARY KEY using index "toast_checks_pkey";

alter table "public"."toast_employees" add constraint "toast_employees_pkey" PRIMARY KEY using index "toast_employees_pkey";

alter table "public"."toast_menu_items" add constraint "toast_menu_items_pkey" PRIMARY KEY using index "toast_menu_items_pkey";

alter table "public"."toast_orders" add constraint "toast_orders_pkey" PRIMARY KEY using index "toast_orders_pkey";

alter table "public"."toast_payments" add constraint "toast_payments_pkey" PRIMARY KEY using index "toast_payments_pkey";

alter table "public"."toast_restaurant_info" add constraint "toast_restaurant_info_pkey" PRIMARY KEY using index "toast_restaurant_info_pkey";

alter table "public"."toast_selections" add constraint "toast_selections_pkey" PRIMARY KEY using index "toast_selections_pkey";

alter table "public"."venue_config" add constraint "venue_config_pkey" PRIMARY KEY using index "venue_config_pkey";

alter table "public"."venue_snapshots" add constraint "venue_snapshots_pkey" PRIMARY KEY using index "venue_snapshots_pkey";

alter table "public"."venues" add constraint "venues_pkey" PRIMARY KEY using index "venues_pkey";

alter table "public"."wisk_inventory" add constraint "wisk_inventory_pkey" PRIMARY KEY using index "wisk_inventory_pkey";

alter table "public"."wisk_recipes" add constraint "wisk_recipes_pkey" PRIMARY KEY using index "wisk_recipes_pkey";

alter table "public"."api_credentials" add constraint "api_credentials_service_key" UNIQUE using index "api_credentials_service_key";

alter table "public"."api_credentials" add constraint "valid_service" CHECK ((service = ANY (ARRAY['eventbrite'::text, 'toast'::text, 'wisk'::text, 'resy'::text, 'audience_republic'::text, 'meta'::text, 'opentable'::text, 'square'::text, 'wix'::text]))) not valid;

alter table "public"."api_credentials" validate constraint "valid_service";

alter table "public"."api_sync_status" add constraint "api_sync_status_venue_id_service_key" UNIQUE using index "api_sync_status_venue_id_service_key";

alter table "public"."daily_summaries" add constraint "daily_summaries_date_key" UNIQUE using index "daily_summaries_date_key";

alter table "public"."toast_checks" add constraint "toast_checks_check_guid_snapshot_timestamp_key" UNIQUE using index "toast_checks_check_guid_snapshot_timestamp_key";

alter table "public"."toast_employees" add constraint "toast_employees_employee_guid_key" UNIQUE using index "toast_employees_employee_guid_key";

alter table "public"."toast_menu_items" add constraint "toast_menu_items_item_guid_snapshot_timestamp_key" UNIQUE using index "toast_menu_items_item_guid_snapshot_timestamp_key";

alter table "public"."toast_orders" add constraint "toast_orders_order_guid_snapshot_timestamp_key" UNIQUE using index "toast_orders_order_guid_snapshot_timestamp_key";

alter table "public"."toast_payments" add constraint "toast_payments_payment_guid_snapshot_timestamp_key" UNIQUE using index "toast_payments_payment_guid_snapshot_timestamp_key";

alter table "public"."toast_restaurant_info" add constraint "toast_restaurant_info_location_guid_key" UNIQUE using index "toast_restaurant_info_location_guid_key";

alter table "public"."toast_selections" add constraint "toast_selections_selection_guid_snapshot_timestamp_key" UNIQUE using index "toast_selections_selection_guid_snapshot_timestamp_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_toast_revenue_metrics(start_date timestamp with time zone, end_date timestamp with time zone, location_id_param text DEFAULT NULL::text)
 RETURNS TABLE(total_revenue numeric, total_orders bigint, total_checks bigint, total_payments bigint, average_order_value numeric, average_check_value numeric, total_tips numeric, total_tax numeric, total_discounts numeric)
 LANGUAGE plpgsql
AS $function$
  BEGIN
      RETURN QUERY
      SELECT
          SUM(p.amount + COALESCE(p.tip_amount, 0))::DECIMAL / 100 as
  total_revenue,
          COUNT(DISTINCT o.order_guid) as total_orders,
          COUNT(DISTINCT c.check_guid) as total_checks,
          COUNT(DISTINCT p.payment_guid) as total_payments,
          (SUM(p.amount + COALESCE(p.tip_amount, 0))::DECIMAL /
  NULLIF(COUNT(DISTINCT o.order_guid), 0) / 100) as average_order_value,
          (SUM(p.amount + COALESCE(p.tip_amount, 0))::DECIMAL /
  NULLIF(COUNT(DISTINCT c.check_guid), 0) / 100) as average_check_value,
          SUM(COALESCE(p.tip_amount, 0))::DECIMAL / 100 as total_tips,
          SUM(COALESCE(c.tax_amount, 0))::DECIMAL / 100 as total_tax,
          SUM(ABS(COALESCE(c.applied_discount_amount, 0)))::DECIMAL / 100 as
  total_discounts
      FROM toast_payments p
      JOIN toast_checks c ON p.check_guid = c.check_guid
          AND p.snapshot_timestamp = c.snapshot_timestamp
      JOIN toast_orders o ON p.order_guid = o.order_guid
          AND p.snapshot_timestamp = o.snapshot_timestamp
      WHERE
          o.created_date >= start_date
          AND o.created_date < end_date
          AND (location_id_param IS NULL OR o.location_id = location_id_param)
          AND p.voided = false
          AND c.voided = false
          AND o.voided = false;
  END;
  $function$
;

create or replace view "public"."toast_transactions" as  SELECT p.id,
    p.snapshot_timestamp,
    p.payment_guid AS transaction_id,
    o.location_id,
    o.created_date AS created_at,
    (p.amount + COALESCE(p.tip_amount, 0)) AS total_amount,
    c.tax_amount,
    p.tip_amount,
    abs(COALESCE(c.applied_discount_amount, 0)) AS discount_amount,
    COALESCE((((c.applied_service_charges -> 0) ->> 'amount'::text))::integer, 0) AS service_charge_amount,
    p.type AS source_type,
        CASE
            WHEN (p.refund_status IS NOT NULL) THEN p.refund_status
            WHEN (o.paid_date IS NOT NULL) THEN 'COMPLETED'::text
            ELSE 'PENDING'::text
        END AS status,
    o.order_number AS receipt_number,
    NULL::text AS receipt_url,
    c.customer_guid AS customer_id,
    ((c.customer_first_name || ' '::text) || c.customer_last_name) AS customer_name,
    c.customer_email,
    o.server_guid AS team_member_id,
    NULL::text AS device_id,
    ( SELECT count(*) AS count
           FROM toast_selections s
          WHERE ((s.check_guid = c.check_guid) AND (s.snapshot_timestamp = p.snapshot_timestamp))) AS item_count,
    ( SELECT count(DISTINCT s.item_guid) AS count
           FROM toast_selections s
          WHERE ((s.check_guid = c.check_guid) AND (s.snapshot_timestamp = p.snapshot_timestamp))) AS unique_item_count,
    ( SELECT json_agg(s.*) AS json_agg
           FROM toast_selections s
          WHERE ((s.check_guid = c.check_guid) AND (s.snapshot_timestamp = p.snapshot_timestamp))) AS itemizations,
    json_build_object('payment_guid', p.payment_guid, 'type', p.type, 'card_type', p.card_type, 'last_4_digits', p.last_4_digits) AS payment_details,
    p.refund AS refunds,
    p.created_at AS created_at_db
   FROM ((toast_payments p
     JOIN toast_checks c ON (((p.check_guid = c.check_guid) AND (p.snapshot_timestamp = c.snapshot_timestamp))))
     JOIN toast_orders o ON (((p.order_guid = o.order_guid) AND (p.snapshot_timestamp = o.snapshot_timestamp))))
  WHERE ((p.voided = false) AND (c.voided = false) AND (o.voided = false));


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."action_log" to "anon";

grant insert on table "public"."action_log" to "anon";

grant references on table "public"."action_log" to "anon";

grant select on table "public"."action_log" to "anon";

grant trigger on table "public"."action_log" to "anon";

grant truncate on table "public"."action_log" to "anon";

grant update on table "public"."action_log" to "anon";

grant delete on table "public"."action_log" to "authenticated";

grant insert on table "public"."action_log" to "authenticated";

grant references on table "public"."action_log" to "authenticated";

grant select on table "public"."action_log" to "authenticated";

grant trigger on table "public"."action_log" to "authenticated";

grant truncate on table "public"."action_log" to "authenticated";

grant update on table "public"."action_log" to "authenticated";

grant delete on table "public"."action_log" to "service_role";

grant insert on table "public"."action_log" to "service_role";

grant references on table "public"."action_log" to "service_role";

grant select on table "public"."action_log" to "service_role";

grant trigger on table "public"."action_log" to "service_role";

grant truncate on table "public"."action_log" to "service_role";

grant update on table "public"."action_log" to "service_role";

grant delete on table "public"."api_credentials" to "anon";

grant insert on table "public"."api_credentials" to "anon";

grant references on table "public"."api_credentials" to "anon";

grant select on table "public"."api_credentials" to "anon";

grant trigger on table "public"."api_credentials" to "anon";

grant truncate on table "public"."api_credentials" to "anon";

grant update on table "public"."api_credentials" to "anon";

grant delete on table "public"."api_credentials" to "authenticated";

grant insert on table "public"."api_credentials" to "authenticated";

grant references on table "public"."api_credentials" to "authenticated";

grant select on table "public"."api_credentials" to "authenticated";

grant trigger on table "public"."api_credentials" to "authenticated";

grant truncate on table "public"."api_credentials" to "authenticated";

grant update on table "public"."api_credentials" to "authenticated";

grant delete on table "public"."api_credentials" to "service_role";

grant insert on table "public"."api_credentials" to "service_role";

grant references on table "public"."api_credentials" to "service_role";

grant select on table "public"."api_credentials" to "service_role";

grant trigger on table "public"."api_credentials" to "service_role";

grant truncate on table "public"."api_credentials" to "service_role";

grant update on table "public"."api_credentials" to "service_role";

grant delete on table "public"."api_sync_status" to "anon";

grant insert on table "public"."api_sync_status" to "anon";

grant references on table "public"."api_sync_status" to "anon";

grant select on table "public"."api_sync_status" to "anon";

grant trigger on table "public"."api_sync_status" to "anon";

grant truncate on table "public"."api_sync_status" to "anon";

grant update on table "public"."api_sync_status" to "anon";

grant delete on table "public"."api_sync_status" to "authenticated";

grant insert on table "public"."api_sync_status" to "authenticated";

grant references on table "public"."api_sync_status" to "authenticated";

grant select on table "public"."api_sync_status" to "authenticated";

grant trigger on table "public"."api_sync_status" to "authenticated";

grant truncate on table "public"."api_sync_status" to "authenticated";

grant update on table "public"."api_sync_status" to "authenticated";

grant delete on table "public"."api_sync_status" to "service_role";

grant insert on table "public"."api_sync_status" to "service_role";

grant references on table "public"."api_sync_status" to "service_role";

grant select on table "public"."api_sync_status" to "service_role";

grant trigger on table "public"."api_sync_status" to "service_role";

grant truncate on table "public"."api_sync_status" to "service_role";

grant update on table "public"."api_sync_status" to "service_role";

grant delete on table "public"."chat_history" to "anon";

grant insert on table "public"."chat_history" to "anon";

grant references on table "public"."chat_history" to "anon";

grant select on table "public"."chat_history" to "anon";

grant trigger on table "public"."chat_history" to "anon";

grant truncate on table "public"."chat_history" to "anon";

grant update on table "public"."chat_history" to "anon";

grant delete on table "public"."chat_history" to "authenticated";

grant insert on table "public"."chat_history" to "authenticated";

grant references on table "public"."chat_history" to "authenticated";

grant select on table "public"."chat_history" to "authenticated";

grant trigger on table "public"."chat_history" to "authenticated";

grant truncate on table "public"."chat_history" to "authenticated";

grant update on table "public"."chat_history" to "authenticated";

grant delete on table "public"."chat_history" to "service_role";

grant insert on table "public"."chat_history" to "service_role";

grant references on table "public"."chat_history" to "service_role";

grant select on table "public"."chat_history" to "service_role";

grant trigger on table "public"."chat_history" to "service_role";

grant truncate on table "public"."chat_history" to "service_role";

grant update on table "public"."chat_history" to "service_role";

grant delete on table "public"."cron_logs" to "anon";

grant insert on table "public"."cron_logs" to "anon";

grant references on table "public"."cron_logs" to "anon";

grant select on table "public"."cron_logs" to "anon";

grant trigger on table "public"."cron_logs" to "anon";

grant truncate on table "public"."cron_logs" to "anon";

grant update on table "public"."cron_logs" to "anon";

grant delete on table "public"."cron_logs" to "authenticated";

grant insert on table "public"."cron_logs" to "authenticated";

grant references on table "public"."cron_logs" to "authenticated";

grant select on table "public"."cron_logs" to "authenticated";

grant trigger on table "public"."cron_logs" to "authenticated";

grant truncate on table "public"."cron_logs" to "authenticated";

grant update on table "public"."cron_logs" to "authenticated";

grant delete on table "public"."cron_logs" to "service_role";

grant insert on table "public"."cron_logs" to "service_role";

grant references on table "public"."cron_logs" to "service_role";

grant select on table "public"."cron_logs" to "service_role";

grant trigger on table "public"."cron_logs" to "service_role";

grant truncate on table "public"."cron_logs" to "service_role";

grant update on table "public"."cron_logs" to "service_role";

grant delete on table "public"."daily_summaries" to "anon";

grant insert on table "public"."daily_summaries" to "anon";

grant references on table "public"."daily_summaries" to "anon";

grant select on table "public"."daily_summaries" to "anon";

grant trigger on table "public"."daily_summaries" to "anon";

grant truncate on table "public"."daily_summaries" to "anon";

grant update on table "public"."daily_summaries" to "anon";

grant delete on table "public"."daily_summaries" to "authenticated";

grant insert on table "public"."daily_summaries" to "authenticated";

grant references on table "public"."daily_summaries" to "authenticated";

grant select on table "public"."daily_summaries" to "authenticated";

grant trigger on table "public"."daily_summaries" to "authenticated";

grant truncate on table "public"."daily_summaries" to "authenticated";

grant update on table "public"."daily_summaries" to "authenticated";

grant delete on table "public"."daily_summaries" to "service_role";

grant insert on table "public"."daily_summaries" to "service_role";

grant references on table "public"."daily_summaries" to "service_role";

grant select on table "public"."daily_summaries" to "service_role";

grant trigger on table "public"."daily_summaries" to "service_role";

grant truncate on table "public"."daily_summaries" to "service_role";

grant update on table "public"."daily_summaries" to "service_role";

grant delete on table "public"."eventbrite_attendees" to "anon";

grant insert on table "public"."eventbrite_attendees" to "anon";

grant references on table "public"."eventbrite_attendees" to "anon";

grant select on table "public"."eventbrite_attendees" to "anon";

grant trigger on table "public"."eventbrite_attendees" to "anon";

grant truncate on table "public"."eventbrite_attendees" to "anon";

grant update on table "public"."eventbrite_attendees" to "anon";

grant delete on table "public"."eventbrite_attendees" to "authenticated";

grant insert on table "public"."eventbrite_attendees" to "authenticated";

grant references on table "public"."eventbrite_attendees" to "authenticated";

grant select on table "public"."eventbrite_attendees" to "authenticated";

grant trigger on table "public"."eventbrite_attendees" to "authenticated";

grant truncate on table "public"."eventbrite_attendees" to "authenticated";

grant update on table "public"."eventbrite_attendees" to "authenticated";

grant delete on table "public"."eventbrite_attendees" to "service_role";

grant insert on table "public"."eventbrite_attendees" to "service_role";

grant references on table "public"."eventbrite_attendees" to "service_role";

grant select on table "public"."eventbrite_attendees" to "service_role";

grant trigger on table "public"."eventbrite_attendees" to "service_role";

grant truncate on table "public"."eventbrite_attendees" to "service_role";

grant update on table "public"."eventbrite_attendees" to "service_role";

grant delete on table "public"."eventbrite_events" to "anon";

grant insert on table "public"."eventbrite_events" to "anon";

grant references on table "public"."eventbrite_events" to "anon";

grant select on table "public"."eventbrite_events" to "anon";

grant trigger on table "public"."eventbrite_events" to "anon";

grant truncate on table "public"."eventbrite_events" to "anon";

grant update on table "public"."eventbrite_events" to "anon";

grant delete on table "public"."eventbrite_events" to "authenticated";

grant insert on table "public"."eventbrite_events" to "authenticated";

grant references on table "public"."eventbrite_events" to "authenticated";

grant select on table "public"."eventbrite_events" to "authenticated";

grant trigger on table "public"."eventbrite_events" to "authenticated";

grant truncate on table "public"."eventbrite_events" to "authenticated";

grant update on table "public"."eventbrite_events" to "authenticated";

grant delete on table "public"."eventbrite_events" to "service_role";

grant insert on table "public"."eventbrite_events" to "service_role";

grant references on table "public"."eventbrite_events" to "service_role";

grant select on table "public"."eventbrite_events" to "service_role";

grant trigger on table "public"."eventbrite_events" to "service_role";

grant truncate on table "public"."eventbrite_events" to "service_role";

grant update on table "public"."eventbrite_events" to "service_role";

grant delete on table "public"."square_catalog_items" to "anon";

grant insert on table "public"."square_catalog_items" to "anon";

grant references on table "public"."square_catalog_items" to "anon";

grant select on table "public"."square_catalog_items" to "anon";

grant trigger on table "public"."square_catalog_items" to "anon";

grant truncate on table "public"."square_catalog_items" to "anon";

grant update on table "public"."square_catalog_items" to "anon";

grant delete on table "public"."square_catalog_items" to "authenticated";

grant insert on table "public"."square_catalog_items" to "authenticated";

grant references on table "public"."square_catalog_items" to "authenticated";

grant select on table "public"."square_catalog_items" to "authenticated";

grant trigger on table "public"."square_catalog_items" to "authenticated";

grant truncate on table "public"."square_catalog_items" to "authenticated";

grant update on table "public"."square_catalog_items" to "authenticated";

grant delete on table "public"."square_catalog_items" to "service_role";

grant insert on table "public"."square_catalog_items" to "service_role";

grant references on table "public"."square_catalog_items" to "service_role";

grant select on table "public"."square_catalog_items" to "service_role";

grant trigger on table "public"."square_catalog_items" to "service_role";

grant truncate on table "public"."square_catalog_items" to "service_role";

grant update on table "public"."square_catalog_items" to "service_role";

grant delete on table "public"."square_transactions" to "anon";

grant insert on table "public"."square_transactions" to "anon";

grant references on table "public"."square_transactions" to "anon";

grant select on table "public"."square_transactions" to "anon";

grant trigger on table "public"."square_transactions" to "anon";

grant truncate on table "public"."square_transactions" to "anon";

grant update on table "public"."square_transactions" to "anon";

grant delete on table "public"."square_transactions" to "authenticated";

grant insert on table "public"."square_transactions" to "authenticated";

grant references on table "public"."square_transactions" to "authenticated";

grant select on table "public"."square_transactions" to "authenticated";

grant trigger on table "public"."square_transactions" to "authenticated";

grant truncate on table "public"."square_transactions" to "authenticated";

grant update on table "public"."square_transactions" to "authenticated";

grant delete on table "public"."square_transactions" to "service_role";

grant insert on table "public"."square_transactions" to "service_role";

grant references on table "public"."square_transactions" to "service_role";

grant select on table "public"."square_transactions" to "service_role";

grant trigger on table "public"."square_transactions" to "service_role";

grant truncate on table "public"."square_transactions" to "service_role";

grant update on table "public"."square_transactions" to "service_role";

grant delete on table "public"."toast_checks" to "anon";

grant insert on table "public"."toast_checks" to "anon";

grant references on table "public"."toast_checks" to "anon";

grant select on table "public"."toast_checks" to "anon";

grant trigger on table "public"."toast_checks" to "anon";

grant truncate on table "public"."toast_checks" to "anon";

grant update on table "public"."toast_checks" to "anon";

grant delete on table "public"."toast_checks" to "authenticated";

grant insert on table "public"."toast_checks" to "authenticated";

grant references on table "public"."toast_checks" to "authenticated";

grant select on table "public"."toast_checks" to "authenticated";

grant trigger on table "public"."toast_checks" to "authenticated";

grant truncate on table "public"."toast_checks" to "authenticated";

grant update on table "public"."toast_checks" to "authenticated";

grant delete on table "public"."toast_checks" to "service_role";

grant insert on table "public"."toast_checks" to "service_role";

grant references on table "public"."toast_checks" to "service_role";

grant select on table "public"."toast_checks" to "service_role";

grant trigger on table "public"."toast_checks" to "service_role";

grant truncate on table "public"."toast_checks" to "service_role";

grant update on table "public"."toast_checks" to "service_role";

grant delete on table "public"."toast_employees" to "anon";

grant insert on table "public"."toast_employees" to "anon";

grant references on table "public"."toast_employees" to "anon";

grant select on table "public"."toast_employees" to "anon";

grant trigger on table "public"."toast_employees" to "anon";

grant truncate on table "public"."toast_employees" to "anon";

grant update on table "public"."toast_employees" to "anon";

grant delete on table "public"."toast_employees" to "authenticated";

grant insert on table "public"."toast_employees" to "authenticated";

grant references on table "public"."toast_employees" to "authenticated";

grant select on table "public"."toast_employees" to "authenticated";

grant trigger on table "public"."toast_employees" to "authenticated";

grant truncate on table "public"."toast_employees" to "authenticated";

grant update on table "public"."toast_employees" to "authenticated";

grant delete on table "public"."toast_employees" to "service_role";

grant insert on table "public"."toast_employees" to "service_role";

grant references on table "public"."toast_employees" to "service_role";

grant select on table "public"."toast_employees" to "service_role";

grant trigger on table "public"."toast_employees" to "service_role";

grant truncate on table "public"."toast_employees" to "service_role";

grant update on table "public"."toast_employees" to "service_role";

grant delete on table "public"."toast_menu_items" to "anon";

grant insert on table "public"."toast_menu_items" to "anon";

grant references on table "public"."toast_menu_items" to "anon";

grant select on table "public"."toast_menu_items" to "anon";

grant trigger on table "public"."toast_menu_items" to "anon";

grant truncate on table "public"."toast_menu_items" to "anon";

grant update on table "public"."toast_menu_items" to "anon";

grant delete on table "public"."toast_menu_items" to "authenticated";

grant insert on table "public"."toast_menu_items" to "authenticated";

grant references on table "public"."toast_menu_items" to "authenticated";

grant select on table "public"."toast_menu_items" to "authenticated";

grant trigger on table "public"."toast_menu_items" to "authenticated";

grant truncate on table "public"."toast_menu_items" to "authenticated";

grant update on table "public"."toast_menu_items" to "authenticated";

grant delete on table "public"."toast_menu_items" to "service_role";

grant insert on table "public"."toast_menu_items" to "service_role";

grant references on table "public"."toast_menu_items" to "service_role";

grant select on table "public"."toast_menu_items" to "service_role";

grant trigger on table "public"."toast_menu_items" to "service_role";

grant truncate on table "public"."toast_menu_items" to "service_role";

grant update on table "public"."toast_menu_items" to "service_role";

grant delete on table "public"."toast_orders" to "anon";

grant insert on table "public"."toast_orders" to "anon";

grant references on table "public"."toast_orders" to "anon";

grant select on table "public"."toast_orders" to "anon";

grant trigger on table "public"."toast_orders" to "anon";

grant truncate on table "public"."toast_orders" to "anon";

grant update on table "public"."toast_orders" to "anon";

grant delete on table "public"."toast_orders" to "authenticated";

grant insert on table "public"."toast_orders" to "authenticated";

grant references on table "public"."toast_orders" to "authenticated";

grant select on table "public"."toast_orders" to "authenticated";

grant trigger on table "public"."toast_orders" to "authenticated";

grant truncate on table "public"."toast_orders" to "authenticated";

grant update on table "public"."toast_orders" to "authenticated";

grant delete on table "public"."toast_orders" to "service_role";

grant insert on table "public"."toast_orders" to "service_role";

grant references on table "public"."toast_orders" to "service_role";

grant select on table "public"."toast_orders" to "service_role";

grant trigger on table "public"."toast_orders" to "service_role";

grant truncate on table "public"."toast_orders" to "service_role";

grant update on table "public"."toast_orders" to "service_role";

grant delete on table "public"."toast_payments" to "anon";

grant insert on table "public"."toast_payments" to "anon";

grant references on table "public"."toast_payments" to "anon";

grant select on table "public"."toast_payments" to "anon";

grant trigger on table "public"."toast_payments" to "anon";

grant truncate on table "public"."toast_payments" to "anon";

grant update on table "public"."toast_payments" to "anon";

grant delete on table "public"."toast_payments" to "authenticated";

grant insert on table "public"."toast_payments" to "authenticated";

grant references on table "public"."toast_payments" to "authenticated";

grant select on table "public"."toast_payments" to "authenticated";

grant trigger on table "public"."toast_payments" to "authenticated";

grant truncate on table "public"."toast_payments" to "authenticated";

grant update on table "public"."toast_payments" to "authenticated";

grant delete on table "public"."toast_payments" to "service_role";

grant insert on table "public"."toast_payments" to "service_role";

grant references on table "public"."toast_payments" to "service_role";

grant select on table "public"."toast_payments" to "service_role";

grant trigger on table "public"."toast_payments" to "service_role";

grant truncate on table "public"."toast_payments" to "service_role";

grant update on table "public"."toast_payments" to "service_role";

grant delete on table "public"."toast_restaurant_info" to "anon";

grant insert on table "public"."toast_restaurant_info" to "anon";

grant references on table "public"."toast_restaurant_info" to "anon";

grant select on table "public"."toast_restaurant_info" to "anon";

grant trigger on table "public"."toast_restaurant_info" to "anon";

grant truncate on table "public"."toast_restaurant_info" to "anon";

grant update on table "public"."toast_restaurant_info" to "anon";

grant delete on table "public"."toast_restaurant_info" to "authenticated";

grant insert on table "public"."toast_restaurant_info" to "authenticated";

grant references on table "public"."toast_restaurant_info" to "authenticated";

grant select on table "public"."toast_restaurant_info" to "authenticated";

grant trigger on table "public"."toast_restaurant_info" to "authenticated";

grant truncate on table "public"."toast_restaurant_info" to "authenticated";

grant update on table "public"."toast_restaurant_info" to "authenticated";

grant delete on table "public"."toast_restaurant_info" to "service_role";

grant insert on table "public"."toast_restaurant_info" to "service_role";

grant references on table "public"."toast_restaurant_info" to "service_role";

grant select on table "public"."toast_restaurant_info" to "service_role";

grant trigger on table "public"."toast_restaurant_info" to "service_role";

grant truncate on table "public"."toast_restaurant_info" to "service_role";

grant update on table "public"."toast_restaurant_info" to "service_role";

grant delete on table "public"."toast_selections" to "anon";

grant insert on table "public"."toast_selections" to "anon";

grant references on table "public"."toast_selections" to "anon";

grant select on table "public"."toast_selections" to "anon";

grant trigger on table "public"."toast_selections" to "anon";

grant truncate on table "public"."toast_selections" to "anon";

grant update on table "public"."toast_selections" to "anon";

grant delete on table "public"."toast_selections" to "authenticated";

grant insert on table "public"."toast_selections" to "authenticated";

grant references on table "public"."toast_selections" to "authenticated";

grant select on table "public"."toast_selections" to "authenticated";

grant trigger on table "public"."toast_selections" to "authenticated";

grant truncate on table "public"."toast_selections" to "authenticated";

grant update on table "public"."toast_selections" to "authenticated";

grant delete on table "public"."toast_selections" to "service_role";

grant insert on table "public"."toast_selections" to "service_role";

grant references on table "public"."toast_selections" to "service_role";

grant select on table "public"."toast_selections" to "service_role";

grant trigger on table "public"."toast_selections" to "service_role";

grant truncate on table "public"."toast_selections" to "service_role";

grant update on table "public"."toast_selections" to "service_role";

grant delete on table "public"."venue_config" to "anon";

grant insert on table "public"."venue_config" to "anon";

grant references on table "public"."venue_config" to "anon";

grant select on table "public"."venue_config" to "anon";

grant trigger on table "public"."venue_config" to "anon";

grant truncate on table "public"."venue_config" to "anon";

grant update on table "public"."venue_config" to "anon";

grant delete on table "public"."venue_config" to "authenticated";

grant insert on table "public"."venue_config" to "authenticated";

grant references on table "public"."venue_config" to "authenticated";

grant select on table "public"."venue_config" to "authenticated";

grant trigger on table "public"."venue_config" to "authenticated";

grant truncate on table "public"."venue_config" to "authenticated";

grant update on table "public"."venue_config" to "authenticated";

grant delete on table "public"."venue_config" to "service_role";

grant insert on table "public"."venue_config" to "service_role";

grant references on table "public"."venue_config" to "service_role";

grant select on table "public"."venue_config" to "service_role";

grant trigger on table "public"."venue_config" to "service_role";

grant truncate on table "public"."venue_config" to "service_role";

grant update on table "public"."venue_config" to "service_role";

grant delete on table "public"."venue_snapshots" to "anon";

grant insert on table "public"."venue_snapshots" to "anon";

grant references on table "public"."venue_snapshots" to "anon";

grant select on table "public"."venue_snapshots" to "anon";

grant trigger on table "public"."venue_snapshots" to "anon";

grant truncate on table "public"."venue_snapshots" to "anon";

grant update on table "public"."venue_snapshots" to "anon";

grant delete on table "public"."venue_snapshots" to "authenticated";

grant insert on table "public"."venue_snapshots" to "authenticated";

grant references on table "public"."venue_snapshots" to "authenticated";

grant select on table "public"."venue_snapshots" to "authenticated";

grant trigger on table "public"."venue_snapshots" to "authenticated";

grant truncate on table "public"."venue_snapshots" to "authenticated";

grant update on table "public"."venue_snapshots" to "authenticated";

grant delete on table "public"."venue_snapshots" to "service_role";

grant insert on table "public"."venue_snapshots" to "service_role";

grant references on table "public"."venue_snapshots" to "service_role";

grant select on table "public"."venue_snapshots" to "service_role";

grant trigger on table "public"."venue_snapshots" to "service_role";

grant truncate on table "public"."venue_snapshots" to "service_role";

grant update on table "public"."venue_snapshots" to "service_role";

grant delete on table "public"."venues" to "anon";

grant insert on table "public"."venues" to "anon";

grant references on table "public"."venues" to "anon";

grant select on table "public"."venues" to "anon";

grant trigger on table "public"."venues" to "anon";

grant truncate on table "public"."venues" to "anon";

grant update on table "public"."venues" to "anon";

grant delete on table "public"."venues" to "authenticated";

grant insert on table "public"."venues" to "authenticated";

grant references on table "public"."venues" to "authenticated";

grant select on table "public"."venues" to "authenticated";

grant trigger on table "public"."venues" to "authenticated";

grant truncate on table "public"."venues" to "authenticated";

grant update on table "public"."venues" to "authenticated";

grant delete on table "public"."venues" to "service_role";

grant insert on table "public"."venues" to "service_role";

grant references on table "public"."venues" to "service_role";

grant select on table "public"."venues" to "service_role";

grant trigger on table "public"."venues" to "service_role";

grant truncate on table "public"."venues" to "service_role";

grant update on table "public"."venues" to "service_role";

grant delete on table "public"."wisk_inventory" to "anon";

grant insert on table "public"."wisk_inventory" to "anon";

grant references on table "public"."wisk_inventory" to "anon";

grant select on table "public"."wisk_inventory" to "anon";

grant trigger on table "public"."wisk_inventory" to "anon";

grant truncate on table "public"."wisk_inventory" to "anon";

grant update on table "public"."wisk_inventory" to "anon";

grant delete on table "public"."wisk_inventory" to "authenticated";

grant insert on table "public"."wisk_inventory" to "authenticated";

grant references on table "public"."wisk_inventory" to "authenticated";

grant select on table "public"."wisk_inventory" to "authenticated";

grant trigger on table "public"."wisk_inventory" to "authenticated";

grant truncate on table "public"."wisk_inventory" to "authenticated";

grant update on table "public"."wisk_inventory" to "authenticated";

grant delete on table "public"."wisk_inventory" to "service_role";

grant insert on table "public"."wisk_inventory" to "service_role";

grant references on table "public"."wisk_inventory" to "service_role";

grant select on table "public"."wisk_inventory" to "service_role";

grant trigger on table "public"."wisk_inventory" to "service_role";

grant truncate on table "public"."wisk_inventory" to "service_role";

grant update on table "public"."wisk_inventory" to "service_role";

grant delete on table "public"."wisk_recipes" to "anon";

grant insert on table "public"."wisk_recipes" to "anon";

grant references on table "public"."wisk_recipes" to "anon";

grant select on table "public"."wisk_recipes" to "anon";

grant trigger on table "public"."wisk_recipes" to "anon";

grant truncate on table "public"."wisk_recipes" to "anon";

grant update on table "public"."wisk_recipes" to "anon";

grant delete on table "public"."wisk_recipes" to "authenticated";

grant insert on table "public"."wisk_recipes" to "authenticated";

grant references on table "public"."wisk_recipes" to "authenticated";

grant select on table "public"."wisk_recipes" to "authenticated";

grant trigger on table "public"."wisk_recipes" to "authenticated";

grant truncate on table "public"."wisk_recipes" to "authenticated";

grant update on table "public"."wisk_recipes" to "authenticated";

grant delete on table "public"."wisk_recipes" to "service_role";

grant insert on table "public"."wisk_recipes" to "service_role";

grant references on table "public"."wisk_recipes" to "service_role";

grant select on table "public"."wisk_recipes" to "service_role";

grant trigger on table "public"."wisk_recipes" to "service_role";

grant truncate on table "public"."wisk_recipes" to "service_role";

grant update on table "public"."wisk_recipes" to "service_role";

create policy "Authenticated users can manage actions"
on "public"."action_log"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "Authenticated users can view api_credentials"
on "public"."api_credentials"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access api_credentials"
on "public"."api_credentials"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can manage chat"
on "public"."chat_history"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "Authenticated users can view summaries"
on "public"."daily_summaries"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access summaries"
on "public"."daily_summaries"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view eventbrite attendees"
on "public"."eventbrite_attendees"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access attendees"
on "public"."eventbrite_attendees"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view eventbrite data"
on "public"."eventbrite_events"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access eventbrite"
on "public"."eventbrite_events"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view catalog"
on "public"."square_catalog_items"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access catalog"
on "public"."square_catalog_items"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view square data"
on "public"."square_transactions"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access square"
on "public"."square_transactions"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view toast checks"
on "public"."toast_checks"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_checks"
on "public"."toast_checks"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view toast employees"
on "public"."toast_employees"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_employees"
on "public"."toast_employees"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view toast menu"
on "public"."toast_menu_items"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_menu_items"
on "public"."toast_menu_items"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view toast orders"
on "public"."toast_orders"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_orders"
on "public"."toast_orders"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view toast payments"
on "public"."toast_payments"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_payments"
on "public"."toast_payments"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view restaurant info"
on "public"."toast_restaurant_info"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_restaurant_info"
on "public"."toast_restaurant_info"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view toast selections"
on "public"."toast_selections"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access toast_selections"
on "public"."toast_selections"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view venue_config"
on "public"."venue_config"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access"
on "public"."venue_config"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view all data"
on "public"."venue_snapshots"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access snapshots"
on "public"."venue_snapshots"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view inventory"
on "public"."wisk_inventory"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access wisk"
on "public"."wisk_inventory"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


create policy "Authenticated users can view recipes"
on "public"."wisk_recipes"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role full access recipes"
on "public"."wisk_recipes"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text));


CREATE TRIGGER update_api_credentials_updated_at BEFORE UPDATE ON public.api_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON public.daily_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_config_updated_at BEFORE UPDATE ON public.venue_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


