import "dotenv/config";

const requiredVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

for (const [name, value] of Object.entries(requiredVars)) {
  if (!value) {
    throw new Error(`Variável de ambiente ${name} é obrigatória`);
  }
}

export const env = {
  port: process.env.PORT ?? 3001,
  supabaseUrl: requiredVars.SUPABASE_URL,
  supabaseServiceKey: requiredVars.SUPABASE_SERVICE_ROLE_KEY,
  nodeEnv: process.env.NODE_ENV ?? "production",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
