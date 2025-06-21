CREATE TABLE public.delivery_stats (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    delivery_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_deliveries INT NOT NULL DEFAULT 0,
    total_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT delivery_stats_delivery_id_key UNIQUE (delivery_id)
);

CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.delivery_stats
FOR EACH ROW
EXECUTE PROCEDURE moddatetime (updated_at);

COMMENT ON TABLE public.delivery_stats IS 'Stores statistics for delivery personnel.';
COMMENT ON COLUMN public.delivery_stats.delivery_id IS 'Foreign key to the users table, identifying the delivery person.'; 