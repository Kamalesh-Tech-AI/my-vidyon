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
        const { email, password, role, full_name, institution_id } = await req.json()

        // Initialize Supabase Admin Client with SERVICE ROLE KEY
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Create User in Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: { role, full_name, institution_id },
            email_confirm: true
        })

        if (authError) throw authError

        // 2. Profile is automatically created by the DB Trigger 'handle_new_user'

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

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Install Supabase CLI: npm install supabase --save-dev
 * 2. Login: npx supabase login
 * 3. Link Project: npx supabase link --project-ref your-project-ref
 * 4. Deploy: npx supabase functions deploy create-user
 */
