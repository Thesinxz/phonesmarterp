import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
    const { data, error } = await supabase.storage.createBucket('logos', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
        fileSizeLimit: 5242880, // 5MB limit
    });

    if (error) {
        if (error.message.includes("already exists") || error.message.includes("Entity already exists")) {
            console.log("Bucket already exists. Making sure it's public.");
            const { error: updateError } = await supabase.storage.updateBucket('logos', { public: true });
            if (updateError) {
                console.error("Error making bucket public:", updateError);
            } else {
                console.log("Bucket updated to public successfully.");
            }
        } else {
            console.error("Error creating bucket:", error);
        }
    } else {
        console.log("Bucket created successfully:", data);
    }
}

createBucket();
