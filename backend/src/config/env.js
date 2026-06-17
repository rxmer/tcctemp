import "dotenv/config";

export const env = {
  port: process.env.PORT ?? 3001,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

};
