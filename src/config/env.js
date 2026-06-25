// src/config/env.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Joi = require('joi');

const envVarsSchema = Joi.object({
  PORT: Joi.number().default(5000),
  SUPABASE_URL: Joi.string().uri().required().description('Supabase Project URL'),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required().description('Supabase Service Role Key')
}).unknown();

const { value: envVars, error } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  port: envVars.PORT,
  supabaseUrl: envVars.SUPABASE_URL,
  supabaseServiceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY
};
