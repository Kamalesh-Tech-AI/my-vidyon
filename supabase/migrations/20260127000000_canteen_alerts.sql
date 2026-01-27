-- Migration: Canteen Alerts and Permissions (Final Robust Version)
-- Date: 2026-01-27

-- 1. Ensure canteen_attendance table exists
CREATE TABLE IF NOT EXISTS public.canteen_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL, 
    canteen_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'absent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, canteen_date)
);

-- 2. Ensure schema columns exist
ALTER TABLE public.student_attendance 
ADD COLUMN IF NOT EXISTS canteen_permission TEXT DEFAULT 'allow' CHECK (canteen_permission IN ('allow', 'deny'));

ALTER TABLE public.canteen_attendance 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS activity_log TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Create/Replace violation notification function
CREATE OR REPLACE FUNCTION public.tr_notify_canteen_violation()
RETURNS TRIGGER AS $$
DECLARE
    v_morning_status TEXT;
    v_canteen_perm TEXT;
    v_class_name TEXT;
    v_section TEXT;
    v_student_name TEXT;
    v_inst_uuid UUID; -- Internal Database UUID
    v_inst_slug TEXT; -- Frontend Slug
    v_student_data JSONB;
BEGIN
    -- Only trigger on 'present' status
    IF NEW.status != 'present' THEN
        RETURN NEW;
    END IF;

    -- Look up attendance for today
    SELECT status, canteen_permission INTO v_morning_status, v_canteen_perm
    FROM public.student_attendance
    WHERE student_id = NEW.student_id AND attendance_date = NEW.canteen_date;

    v_morning_status := COALESCE(v_morning_status, 'absent');
    v_canteen_perm := COALESCE(v_canteen_perm, 'allow');

    -- Diagnostic: Check for violation
    IF v_morning_status = 'absent' OR v_canteen_perm = 'deny' THEN
        
        -- Resolve Institution UUID from common sources
        -- NEW.institution_id is usually the slug (e.g. 'MY-VIDYON-ERP')
        SELECT id INTO v_inst_uuid 
        FROM public.institutions 
        WHERE (institution_id = NEW.institution_id OR id::text = NEW.institution_id)
        LIMIT 1;

        -- Get student details using JSONB for schema-insensitivity (handles name vs full_name)
        SELECT to_jsonb(s) INTO v_student_data 
        FROM public.students s 
        WHERE s.id = NEW.student_id;

        v_student_name := COALESCE(v_student_data->>'full_name', v_student_data->>'name', 'Student');
        v_class_name := v_student_data->>'class_name';
        v_section := v_student_data->>'section';
        
        -- If v_inst_uuid still null, fallback to student's record
        v_inst_uuid := COALESCE(v_inst_uuid, (v_student_data->>'institution_id')::uuid);

        -- 1. Notify Student
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
            NEW.student_id,
            'Canteen Entry Alert',
            'Unauthorized canteen entry detected. Status: ' || v_morning_status || '.',
            'attendance',
            NEW.photo_url
        );

        -- 2. Notify Parents
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT DISTINCT profile_id, 
               'Canteen Alert: ' || v_student_name, 
               'Your child was detected in the canteen but is marked as ' || v_morning_status || ' today.', 
               'attendance', 
               NEW.photo_url
        FROM (
            -- Join Table Strategy
            SELECT pr.profile_id FROM public.student_parents sp
            INNER JOIN public.parents pr ON sp.parent_id = pr.id
            WHERE sp.student_id = NEW.student_id AND pr.profile_id IS NOT NULL
            UNION
            -- Direct Column Strategy
            SELECT (v_student_data->>'parent_id')::uuid WHERE (v_student_data->>'parent_id') IS NOT NULL
        ) as combined_parents;

        -- 3. Notify Class Teacher
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT DISTINCT teacher_id, 
               'Canteen Violation: ' || v_student_name, 
               v_student_name || ' (Class ' || v_class_name || ') is ' || v_morning_status || ' but entered canteen.', 
               'attendance', 
               NEW.photo_url
        FROM (
            -- Classes Table Strategy
            SELECT class_teacher_id FROM public.classes 
            WHERE name = v_class_name 
            AND (section IS NULL OR section = v_section) 
            AND (institution_id = v_inst_uuid)
            AND class_teacher_id IS NOT NULL
            UNION
            -- Faculty Assignments Strategy
            SELECT fs.faculty_profile_id FROM public.faculty_subjects fs
            INNER JOIN public.classes c ON fs.class_id = c.id
            WHERE c.name = v_class_name AND (c.section = v_section OR fs.section = v_section)
            AND fs.assignment_type = 'class_teacher'
            AND fs.institution_id = v_inst_uuid
        ) as combined_teachers;
        
        -- 4. Notify Campus Admins
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT id, 
               'Security Notice: ' || v_student_name, 
               'Unauthorized canteen entry: ' || v_student_name || ' (Class ' || v_class_name || ').', 
               'attendance', 
               NEW.photo_url
        FROM public.profiles
        WHERE institution_id = v_inst_uuid
        AND role IN ('admin', 'institution')
        AND id != NEW.student_id
        LIMIT 10;

    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent trigger crash from blocking canteen operations
    RAISE WARNING 'Canteen notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger
DROP TRIGGER IF EXISTS tr_canteen_violation ON public.canteen_attendance;
CREATE TRIGGER tr_canteen_violation
AFTER INSERT OR UPDATE ON public.canteen_attendance
FOR EACH ROW EXECUTE FUNCTION public.tr_notify_canteen_violation();

-- 5. Permissions
ALTER TABLE public.canteen_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public canteen access" ON public.canteen_attendance;
CREATE POLICY "Public canteen access" ON public.canteen_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
