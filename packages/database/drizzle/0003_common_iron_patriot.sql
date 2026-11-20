CREATE TYPE "public"."mentorship_pricing_mode" AS ENUM('free', 'paid', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."billing_cadence" AS ENUM('free', 'hourly', 'per_session', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('not_required', 'pending_checkout', 'completed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('free', 'plus', 'pro');--> statement-breakpoint
CREATE TABLE "mentorship_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"mentorship_id" uuid,
	"mentor_id" uuid NOT NULL,
	"mentee_id" uuid NOT NULL,
	"billing_cadence" "billing_cadence" DEFAULT 'per_session' NOT NULL,
	"gross_amount_ngn" integer NOT NULL,
	"platform_fee_ngn" integer NOT NULL,
	"mentor_payout_ngn" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'NGN' NOT NULL,
	"provider" varchar(40) DEFAULT 'paystack' NOT NULL,
	"provider_reference" varchar(140),
	"status" "payment_status" DEFAULT 'pending_checkout' NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentorship_transactions_provider_reference_unique" UNIQUE("provider_reference"),
	CONSTRAINT "non_negative_transaction_amounts" CHECK ("mentorship_transactions"."gross_amount_ngn" >= 0 AND "mentorship_transactions"."platform_fee_ngn" >= 0 AND "mentorship_transactions"."mentor_payout_ngn" >= 0),
	CONSTRAINT "split_sum_equals_gross" CHECK ("mentorship_transactions"."platform_fee_ngn" + "mentorship_transactions"."mentor_payout_ngn" = "mentorship_transactions"."gross_amount_ngn")
);
--> statement-breakpoint
CREATE TABLE "membership_tier_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" varchar(320) NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"tier" "membership_tier" DEFAULT 'plus' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD COLUMN "pricing_mode" "mentorship_pricing_mode" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD COLUMN "offers_free_mentorship" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD COLUMN "hourly_rate_ngn" integer;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD COLUMN "session_rate_ngn" integer;--> statement-breakpoint
ALTER TABLE "mentor_profiles" ADD COLUMN "monthly_rate_ngn" integer;--> statement-breakpoint
ALTER TABLE "mentorship_requests" ADD COLUMN "billing_cadence" "billing_cadence" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "mentorship_requests" ADD COLUMN "agreed_amount_ngn" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mentorship_requests" ADD COLUMN "selected_slot_summary" varchar(160);--> statement-breakpoint
ALTER TABLE "mentorship_transactions" ADD CONSTRAINT "mentorship_transactions_request_id_mentorship_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."mentorship_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_transactions" ADD CONSTRAINT "mentorship_transactions_mentorship_id_mentorships_id_fk" FOREIGN KEY ("mentorship_id") REFERENCES "public"."mentorships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_transactions" ADD CONSTRAINT "mentorship_transactions_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_transactions" ADD CONSTRAINT "mentorship_transactions_mentee_id_users_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_tier_interests" ADD CONSTRAINT "membership_tier_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;