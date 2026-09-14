// supabaseConfig.js
// Supabase configuration for Portfolio
export const supabaseUrl = "https://jsutdvvjxgbnasxkqjgf.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdXRkdnZqeGdibmFzeGtxamdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTQ5MDQsImV4cCI6MjEwNDkzMDkwNH0.6kZPjWclzMyeKJGoumo8bui6IylOSDXeI0hzhAfOxtA";

// Create Supabase client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
