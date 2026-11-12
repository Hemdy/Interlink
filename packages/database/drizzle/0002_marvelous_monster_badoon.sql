CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid,
	"attendee_name" varchar(160) NOT NULL,
	"attendee_email" varchar(320) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_reels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid,
	"mentor_name" varchar(160) NOT NULL,
	"profession" varchar(160) NOT NULL,
	"career_path" varchar(240) NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"video_url" text NOT NULL,
	"poster_image_url" text,
	"duration_label" varchar(20) DEFAULT '0:45' NOT NULL,
	"topic_tag" varchar(80) DEFAULT 'Career Growth' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"category" varchar(40) DEFAULT 'workshop' NOT NULL,
	"summary" text NOT NULL,
	"image_url" text NOT NULL,
	"event_date" timestamp with time zone,
	"location_or_format" varchar(160) NOT NULL,
	"cta_label" varchar(80) DEFAULT 'Reserve Seat' NOT NULL,
	"cta_url" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_platform_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."platform_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_reels" ADD CONSTRAINT "mentor_reels_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;