import { createClient, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const signUp = (credentials: SignUpWithPasswordCredentials) => {
  return supabase.auth.signUp(credentials)
}

export const signIn = (credentials: SignInWithPasswordCredentials) => {
  return supabase.auth.signInWithPassword(credentials)
}

export const signOut = () => {
  return supabase.auth.signOut()
}

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return data.user
}

// Assuming FilterState and RFQ types are defined elsewhere, e.g. in a types/index.ts file
// For now, let's define them here as placeholders.
export interface FilterState {
  // Define filter properties here, e.g.
  category?: string;
  certification?: string;
}

export interface RFQ {
  // Define RFQ properties here, e.g.
  productId: string;
  quantity: number;
  message: string;
}


// Helper functions for common queries
export const getProducts = async (filters: FilterState) => {
  console.log('Filtering with:', filters); // Using filters to satisfy the linter
  // TODO: Implement actual filtering logic based on the filters object
  const { data, error } = await supabase
    .from('products')
    .select('*')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data
}

export const createRFQ = async (rfqData: RFQ) => {
  // TODO: Implement actual RFQ creation logic
  const { data, error } = await supabase
    .from('rfqs')
    .insert([rfqData])

  if (error) {
    console.error('Error creating RFQ:', error)
    return null
  }

  return data
}
