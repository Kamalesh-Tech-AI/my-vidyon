// File: supabase/functions/create-user/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, role, full_name, institution_id, register_number, staff_id, phone, student_id, parent_email, parent_phone, parent_name } = await req.json()

        if (!email || !role || !institution_id) {
            throw new Error("Missing required fields: email, role, and institution_id are required.")
        }

        // Initialize Supabase Admin Client with SERVICE ROLE KEY
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Internal Configuration Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in the Edge Function environment.");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // Determine password: use provided password or default to institution_id
        // Helper to normalize role
        const normalizeRole = (r: string) => {
            const lower = r.toLowerCase();
            return lower === 'teacher' ? 'faculty' : lower;
        };

        const finalRole = normalizeRole(role);

        // Validate password length (Supabase requires 6 chars)
        let finalPassword = password || institution_id;
        if (finalPassword.length < 6) {
            finalPassword = finalPassword.padEnd(6, '0'); // Pad with zeros if too short
        }
        const forcePasswordChange = !password;

        // 1. Create User in Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: finalPassword,
            user_metadata: {
                role: finalRole,
                full_name,
                institution_id,
                force_password_change: forcePasswordChange
            },
            email_confirm: true
        })

        if (authError) throw authError

        const userId = authUser.user.id;

        // 2. Explicitly Insert/Update Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: full_name,
                role: role,
                institution_id: institution_id,
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            console.error("Error creating/updating profile record:", profileError);
        }

        // 3. Role-specific table insertions
        if (finalRole === 'student') {
            const { error: studentError } = await supabaseAdmin
                .from('students')
                .upsert({
                    id: userId,
                    name: full_name,
                    email: email,
                    institution_id: institution_id,
                    register_number: register_number || `REG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    parent_email: parent_email,
                    parent_phone: parent_phone,
                    parent_name: parent_name
                });
            if (studentError) console.error("Error creating student record:", studentError);
        } else if (finalRole === 'parent') {
            const { data: parentData, error: parentError } = await supabaseAdmin
                .from('parents')
                .upsert({
                    profile_id: userId,
                    name: full_name,
                    email: email,
                    institution_id: institution_id,
                    phone: phone
                }, { onConflict: 'email' })
                .select()
                .single();

            if (parentError) {
                console.error("Error creating parent record:", parentError);
            } else if (student_id && parentData) {
                // Link to student if provided
                const { error: linkError } = await supabaseAdmin
                    .from('student_parents')
                    .upsert({
                        student_id: student_id,
                        parent_id: parentData.id
                    });
                if (linkError) console.error("Error linking parent to student:", linkError);
            }
        } else if (finalRole === 'faculty' || finalRole === 'institution' || finalRole === 'admin') {
            const { error: staffError } = await supabaseAdmin
                .from('staff_details')
                .upsert({
                    profile_id: userId,
                    institution_id: institution_id,
                    role: finalRole,
                    staff_id: staff_id || `STF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                }, {
                    onConflict: 'profile_id'
                });
            if (staffError) console.error("Error creating staff record:", staffError);

            // SPECIAL CASE: Link Institution Admin Email
            if (role === 'institution') {
                const { error: instUpdateError } = await supabaseAdmin
                    .from('institutions')
                    .update({ admin_email: email, admin_password: finalPassword })
                    .eq('institution_id', institution_id);
                if (instUpdateError) console.error("Error linking institution admin email:", instUpdateError);
            }
        }

        return new Response(
            JSON.stringify({ user: authUser.user }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
