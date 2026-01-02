const supabase = require('./client');

/**
 * Verify JWT from frontend
 * @param {string} token
 */
const verifySupabaseToken = async (token) => {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        console.error('Error verifying Supabase token:', error);
        throw error;
    }
    return user;
};

/**
 * Create auth user in Supabase
 * @param {string} email
 * @param {string} password
 */
const createSupabaseUser = async (email, password) => {
    // using admin api to create user without signing in
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Auto confirm since we are creating from backend
    });

    if (error) {
        console.error('Error creating Supabase user:', error);
        throw error;
    }
    return data.user;
};

/**
 * Link accounts (update Supabase user metadata with Postgres ID)
 * @param {string} supabaseId
 * @param {string} postgresUserId
 */
const linkSupabaseToPostgres = async (supabaseId, postgresUserId) => {
    const { data, error } = await supabase.auth.admin.updateUserById(
        supabaseId,
        { user_metadata: { postgres_user_id: postgresUserId } }
    );

    if (error) {
        console.error('Error linking Supabase to Postgres:', error);
        throw error;
    }
    return data;
};

module.exports = {
    verifySupabaseToken,
    createSupabaseUser,
    linkSupabaseToPostgres
};
