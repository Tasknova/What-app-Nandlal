-- Add reports_data column to campaigns table for storing campaign-specific report data
ALTER TABLE public.campaigns 
ADD COLUMN reports_data JSONB DEFAULT NULL;

-- Add index for better performance when querying reports_data
CREATE INDEX idx_campaigns_reports_data ON public.campaigns USING GIN (reports_data);

-- Add comment to document the column purpose
COMMENT ON COLUMN public.campaigns.reports_data IS 'JSON data containing campaign-specific message reports from WhatsApp API';
