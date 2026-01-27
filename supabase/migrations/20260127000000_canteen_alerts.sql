-- Migration: Canteen Alerts & Auto-Permission Sync
-- Date: 2026-01-27

-- 1. Automatic Canteen Permission Sync Trigger
-- Ensures that if a student is marked absent in morning attendance, they are automatically denied canteen access.
CREATE OR REPLACE FUNCTION public.tr_sync_canteen_permission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'absent' THEN
        NEW.canteen_permission := 'deny';
    ELSIF NEW.status = 'present' AND NEW.canteen_permission IS NULL THEN
        NEW.canteen_permission := 'allow';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_attendance_canteen_sync ON public.student_attendance;
CREATE TRIGGER tr_attendance_canteen_sync
BEFORE INSERT OR UPDATE ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION public.tr_sync_canteen_permission();

-- 2. Enhanced Violation Notification Function (with Debugging and Fallbacks)
CREATE OR REPLACE FUNCTION public.tr_notify_canteen_violation()
RETURNS TRIGGER AS $$
DECLARE
    v_morning_status TEXT;
    v_canteen_perm TEXT;
    v_class_name TEXT;
    v_section TEXT;
    v_student_name TEXT;
    v_inst_uuid UUID; 
    v_student_data JSONB;
BEGIN
    -- [DEBUG] Log the start of the trigger
    RAISE NOTICE 'tr_notify_canteen_violation: Processing student % on % (Status: %)', NEW.student_id, NEW.canteen_date, NEW.status;

    -- Only trigger on 'present' status
    IF NEW.status != 'present' THEN
        RAISE NOTICE 'tr_notify_canteen_violation: Status is not present. Skipping.';
        RETURN NEW;
    END IF;

    -- Look up attendance for today
    SELECT status, canteen_permission INTO v_morning_status, v_canteen_perm
    FROM public.student_attendance
    WHERE student_id = NEW.student_id AND attendance_date = NEW.canteen_date;

    v_morning_status := COALESCE(v_morning_status, 'absent');
    v_canteen_perm := COALESCE(v_canteen_perm, 'allow');

    RAISE NOTICE 'tr_notify_canteen_violation: Morning Status: %, Canteen Perm: %', v_morning_status, v_canteen_perm;

    -- Violation Check
    IF v_morning_status = 'absent' OR v_canteen_perm = 'deny' THEN
        RAISE NOTICE 'tr_notify_canteen_violation: VIOLATION DETECTED';

        -- Resolve Institution UUID
        -- First try matching the slug (NEW.institution_id is usually 'MYVID2026')
        -- Fallback to the UUID if the frontend already sent it correctly
        SELECT id INTO v_inst_uuid 
        FROM public.institutions 
        WHERE (institution_id = NEW.institution_id OR id::text = NEW.institution_id)
        LIMIT 1;

        RAISE NOTICE 'tr_notify_canteen_violation: Resolved Inst UUID: %', v_inst_uuid;

        -- Get student details (Defensive handling of naming variations)
        SELECT to_jsonb(s) INTO v_student_data FROM public.students s WHERE s.id = NEW.student_id;
        v_student_name := COALESCE(v_student_data->>'full_name', v_student_data->>'name', 'Student');
        v_class_name := v_student_data->>'class_name';
        v_section := v_student_data->>'section';
        
        -- Fallback to student's record for inst_id if still null
        v_inst_uuid := COALESCE(v_inst_uuid, (v_student_data->>'institution_id')::uuid);

        RAISE NOTICE 'tr_notify_canteen_violation: Student found: %, Class: %', v_student_name, v_class_name;

        -- 1. Notify Student
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
            NEW.student_id,
            'Canteen Entry Alert',
            'You have been detected in the canteen while marked ' || v_morning_status || ' today.',
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
            -- Student Parents Join Table
            SELECT pr.profile_id FROM public.student_parents sp
            INNER JOIN public.parents pr ON sp.parent_id = pr.id
            WHERE sp.student_id = NEW.student_id AND pr.profile_id IS NOT NULL
            UNION
            -- Direct parent_id in students table
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
            -- Classes table lookup
            SELECT class_teacher_id FROM public.classes 
            WHERE name = v_class_name AND (section IS NULL OR section = v_section) 
            AND (institution_id = v_inst_uuid)
            AND class_teacher_id IS NOT NULL
            UNION
            -- Faculty Subjects lookup
            SELECT fs.faculty_profile_id FROM public.faculty_subjects fs
            INNER JOIN public.classes c ON fs.class_id = c.id
            WHERE c.name = v_class_name AND (c.section = v_section OR fs.section = v_section)
            AND fs.assignment_type = 'class_teacher'
            AND fs.institution_id = v_inst_uuid
        ) as combined_teachers;
        
        -- 4. Notify Campus Admins
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT id, 
               'Security Incident: Canteen', 
               v_student_name || ' triggered a canteen alert (Morning Status: ' || v_morning_status || ').', 
               'error', 
               NEW.photo_url
        FROM public.profiles
        WHERE institution_id = v_inst_uuid
        AND role IN ('admin', 'institution')
        AND id != NEW.student_id
        LIMIT 10;
        
        RAISE NOTICE 'tr_notify_canteen_violation: Notifications sent.';
    ELSE
         RAISE NOTICE 'tr_notify_canteen_violation: No violation found.';
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Canteen notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure trigger is active (Fixed Syntax: FOR EACH ROW must come after AFTER)
DROP TRIGGER IF EXISTS tr_canteen_violation ON public.canteen_attendance;
CREATE TRIGGER tr_canteen_violation
AFTER INSERT OR UPDATE ON public.canteen_attendance
FOR EACH ROW
EXECUTE FUNCTION public.tr_notify_canteen_violation();

-- 4. Fast Sync for Today's Data
UPDATE public.student_attendance
SET canteen_permission = 'deny'
WHERE status = 'absent' 
AND attendance_date = CURRENT_DATE 
AND (canteen_permission IS NULL OR canteen_permission = 'allow');
