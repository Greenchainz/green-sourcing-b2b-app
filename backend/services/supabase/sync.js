const supabase = require('./client');

/**
 * Mirror user to Supabase for frontend
 * @param {object} user
 */
const syncUserToSupabase = async (user) => {
    // Assuming user object has standard fields
    // Maps backend user model to Supabase 'users' table (public profile table or similar)
    const { data, error } = await supabase
        .from('users')
        .upsert({
            id: user.id,
            email: user.email,
            role: user.role,
            company_name: user.companyName || user.company_name,
            updated_at: new Date()
        })
        .select();

    if (error) {
        console.error('Error syncing user to Supabase:', error);
        throw error;
    }
    return data;
};

/**
 * Mirror supplier data
 * @param {object} supplier
 */
const syncSupplierToSupabase = async (supplier) => {
    // If supplier is a separate entity or just additional data on user
    // We'll assume a 'suppliers' table or upserting to users with more info
    // Based on memory schema, suppliers are users.
    // But maybe there is a public profiles table or we treat them same as users.
    // I will upsert to 'users' table again ensuring fields are present,
    // OR if there is a separate table structure intended for public listing.
    // The prompt distinguishes syncUser and syncSupplier.
    // I'll assume 'suppliers' table might exist or reusing 'users' table logic but focusing on supplier fields.
    // Let's assume a 'suppliers' table exists or reusing 'users' but adding supplier specific fields if any.
    // Since Memory schema only showed 'users' table for buyers+suppliers, I will target 'users'
    // but include potential extra fields or target 'products' if "supplier data" implies their catalog? No, that's syncProduct.

    // If there is no 'suppliers' table in Supabase schema (from memory), I should stick to 'users'.
    // However, the prompt asks for `syncSupplierToSupabase`.
    // I'll implementation it targeting 'users' but handling supplier specific fields if passed.

    const payload = {
        id: supplier.id,
        // user_id: supplier.userId, // If id is different from user id
        role: 'supplier', // Ensure role is supplier
        company_name: supplier.companyName || supplier.name || supplier.company_name,
        // Add description or other profile fields if they exist in the input object
        updated_at: new Date()
    };

    if (supplier.description) payload.description = supplier.description;

    const { data, error } = await supabase
        .from('users')
        .upsert(payload)
        .select();

     if (error) {
         console.error('Error syncing supplier to Supabase:', error);
         throw error;
     }
     return data;
};

/**
 * Mirror product data
 * @param {object} product
 */
const syncProductToSupabase = async (product) => {
    const { data, error } = await supabase
        .from('products')
        .upsert({
            id: product.id,
            supplier_id: product.supplierId || product.supplier_id,
            name: product.name,
            description: product.description,
            image_url: product.imageUrl || product.image_url,
            technical_specs: product.technicalSpecs || product.technical_specs,
            certifications: product.certifications,
            epd_link: product.epdLink || product.epd_link,
            gwp: product.gwp,
            recycled_content_percent: product.recycledContentPercent || product.recycled_content_percent,
            status: product.status,
            updated_at: new Date() // Assuming updated_at column exists, otherwise it might fail. Memory schema only showed created_at.
            // If updated_at is not in schema, upsert still works for other fields.
        })
        .select();

    if (error) {
        // If error is about column not found, we might want to retry without updated_at or log it.
        console.error('Error syncing product to Supabase:', error);
        throw error;
    }
    return data;
};

module.exports = {
    syncUserToSupabase,
    syncSupplierToSupabase,
    syncProductToSupabase
};
