// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signUp = (credentials: SignUpWithPasswordCredentials) => {
  return supabase.auth.signUp(credentials);
};

export const signIn = (credentials: SignInWithPasswordCredentials) => {
  return supabase.auth.signInWithPassword(credentials);
};

export const signOut = () => {
  return supabase.auth.signOut();
};

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return data.user;
};
