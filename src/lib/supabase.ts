import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hccwigqgvegvtujedbie.supabase.co';
const supabaseKey = 'sb_publishable_Jhe7yH6h1zCm3Mud-5rB7g_PN3wh2DN';

export const supabase = createClient(supabaseUrl, supabaseKey);
