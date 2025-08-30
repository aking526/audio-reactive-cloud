-- Audio Reactive Cloud - Database Migration
-- This file contains the SQL migration to support saving audio projects with effects
-- Run this in the Supabase SQL editor

-- ============================================================================
-- 1. Create audio_projects table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audio_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    original_file_url TEXT NOT NULL, -- Supabase storage URL for original file
    processed_file_url TEXT, -- Supabase storage URL for processed file (nullable until processing is complete)
    file_size_bytes BIGINT NOT NULL,
    duration_seconds DECIMAL(10,3), -- Audio duration in seconds
    mime_type VARCHAR(100) NOT NULL,
    
    -- Audio effects settings (stored as JSON for flexibility)
    effects_settings JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_project_name CHECK (LENGTH(project_name) >= 1 AND LENGTH(project_name) <= 255),
    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0),
    CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audio_projects_user_id ON public.audio_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_projects_created_at ON public.audio_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_projects_user_created ON public.audio_projects(user_id, created_at DESC);

-- ============================================================================
-- 3. Create audio_effects table (for tracking supported effects and their schemas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audio_effects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    effect_name VARCHAR(100) NOT NULL UNIQUE,
    effect_type VARCHAR(50) NOT NULL, -- 'filter', 'time', 'pitch', 'volume', etc.
    description TEXT,
    parameter_schema JSONB NOT NULL DEFAULT '{}', -- JSON schema defining valid parameters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_effect_name CHECK (LENGTH(effect_name) >= 1)
);

-- ============================================================================
-- 4. Insert default audio effects
-- ============================================================================

INSERT INTO public.audio_effects (effect_name, effect_type, description, parameter_schema) VALUES 
(
    'bass_boost', 
    'filter', 
    'Low-frequency boost filter',
    '{
        "type": "object",
        "properties": {
            "enabled": {"type": "boolean"},
            "amount": {"type": "number", "minimum": 0, "maximum": 20}
        },
        "required": ["enabled"]
    }'::jsonb
),
(
    'speed_control', 
    'time', 
    'Audio playback speed adjustment',
    '{
        "type": "object",
        "properties": {
            "enabled": {"type": "boolean"},
            "speed": {"type": "number", "minimum": 0.25, "maximum": 4.0}
        },
        "required": ["enabled"]
    }'::jsonb
),
(
    'pitch_shift', 
    'pitch', 
    'Pitch shifting without affecting tempo',
    '{
        "type": "object",
        "properties": {
            "enabled": {"type": "boolean"},
            "semitones": {"type": "number", "minimum": -24, "maximum": 24}
        },
        "required": ["enabled"]
    }'::jsonb
),
(
    'volume', 
    'volume', 
    'Master volume control',
    '{
        "type": "object",
        "properties": {
            "level": {"type": "number", "minimum": 0, "maximum": 2}
        },
        "required": ["level"]
    }'::jsonb
);

-- ============================================================================
-- 5. Create project_sharing table (for future sharing functionality)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_sharing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.audio_projects(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means public
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means no expiration
    
    CONSTRAINT valid_permission CHECK (permission_level IN ('view', 'edit', 'admin')),
    CONSTRAINT no_self_share CHECK (shared_by_user_id != shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_sharing_project_id ON public.project_sharing(project_id);
CREATE INDEX IF NOT EXISTS idx_project_sharing_shared_with ON public.project_sharing(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_project_sharing_public ON public.project_sharing(is_public) WHERE is_public = true;

-- ============================================================================
-- 6. Create updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to audio_projects
CREATE TRIGGER update_audio_projects_updated_at 
    BEFORE UPDATE ON public.audio_projects 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.audio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sharing ENABLE ROW LEVEL SECURITY;

-- Audio Projects Policies
CREATE POLICY "Users can view their own projects" ON public.audio_projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.audio_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.audio_projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.audio_projects
    FOR DELETE USING (auth.uid() = user_id);

-- Audio Effects Policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view audio effects" ON public.audio_effects
    FOR SELECT TO authenticated USING (true);

-- Project Sharing Policies
CREATE POLICY "Users can view shares involving them" ON public.project_sharing
    FOR SELECT USING (
        auth.uid() = shared_by_user_id OR 
        auth.uid() = shared_with_user_id OR 
        is_public = true
    );

CREATE POLICY "Users can share their own projects" ON public.project_sharing
    FOR INSERT WITH CHECK (
        auth.uid() = shared_by_user_id AND
        EXISTS (
            SELECT 1 FROM public.audio_projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage shares they created" ON public.project_sharing
    FOR ALL USING (auth.uid() = shared_by_user_id);

-- ============================================================================
-- 8. Create storage buckets (via SQL - but you'll need to configure policies manually)
-- ============================================================================

-- Note: Storage bucket creation and policies need to be configured in the Supabase dashboard
-- The buckets needed are:
-- - 'audio-files-original' (for uploaded original files)
-- - 'audio-files-processed' (for processed files with effects applied)

-- ============================================================================
-- 9. Create helpful views
-- ============================================================================

-- View for projects with effect summaries
CREATE OR REPLACE VIEW public.audio_projects_with_effects AS
SELECT 
    p.*,
    CASE 
        WHEN p.effects_settings->>'bass_boost' IS NOT NULL AND (p.effects_settings->'bass_boost'->>'enabled')::boolean = true
        THEN 'Bass Boost (' || (p.effects_settings->'bass_boost'->>'amount') || 'dB)'
        ELSE NULL
    END as bass_boost_summary,
    CASE 
        WHEN p.effects_settings->>'speed_control' IS NOT NULL AND (p.effects_settings->'speed_control'->>'enabled')::boolean = true
        THEN 'Speed (' || (p.effects_settings->'speed_control'->>'speed') || 'x)'
        ELSE NULL
    END as speed_control_summary,
    CASE 
        WHEN p.effects_settings->>'pitch_shift' IS NOT NULL AND (p.effects_settings->'pitch_shift'->>'enabled')::boolean = true
        THEN 'Pitch (' || (p.effects_settings->'pitch_shift'->>'semitones') || ' semitones)'
        ELSE NULL
    END as pitch_shift_summary
FROM public.audio_projects p;

-- ============================================================================
-- 10. Sample data for testing (optional - remove in production)
-- ============================================================================

-- Uncomment the following to insert sample data for testing:
/*
-- This assumes you have a test user - replace the UUID with an actual user ID from auth.users
INSERT INTO public.audio_projects (
    user_id, 
    project_name, 
    original_filename, 
    original_file_url, 
    file_size_bytes, 
    duration_seconds, 
    mime_type, 
    effects_settings
) VALUES (
    'YOUR_TEST_USER_UUID_HERE', 
    'My First Project', 
    'test-audio.mp3', 
    'https://your-supabase-project.supabase.co/storage/v1/object/public/audio-files-original/test-audio.mp3',
    1048576, 
    180.5, 
    'audio/mpeg',
    '{
        "bass_boost": {"enabled": true, "amount": 6},
        "speed_control": {"enabled": true, "speed": 1.3},
        "volume": {"level": 0.75}
    }'::jsonb
);
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- After running this migration, you'll need to:
-- 1. Create storage buckets in the Supabase dashboard
-- 2. Configure storage policies
-- 3. Update your application code to use these tables
-- 4. Test the RLS policies with your authentication flow
