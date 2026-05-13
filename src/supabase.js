import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eucwtjhnbgtkbjohleqn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Y3d0amhuYmd0a2Jqb2hsZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzYzODQsImV4cCI6MjA5NDA1MjM4NH0.8NIZKuwE_CpU-L1NzpMHTVx0qxjs_MTigzH8LJ8NZGQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);