const supabase = require('./client');

/**
 * Upload file to Supabase Storage
 * @param {object|Buffer} file - File object (e.g. from multer) or Buffer
 * @param {string} bucket - Bucket name ('certifications', 'products', 'avatars', 'documents')
 * @param {string} path - File path in bucket
 */
const uploadToSupabaseStorage = async (file, bucket, path) => {
    // Check if file has buffer (multer) or is buffer
    const fileBody = file.buffer || file;
    const contentType = file.mimetype || 'application/octet-stream';

    const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(path, fileBody, {
            contentType: contentType,
            upsert: true
        });

    if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
    }
    return data;
};

/**
 * Get public CDN URL for a file
 * @param {string} bucket
 * @param {string} path
 */
const getPublicUrl = (bucket, path) => {
    const { data } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(path);

    return data.publicUrl;
};

/**
 * Delete file from Supabase Storage
 * @param {string} bucket
 * @param {string} path
 */
const deleteFile = async (bucket, path) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .remove([path]);

    if (error) {
        console.error('Error deleting file from Supabase Storage:', error);
        throw error;
    }
    return data;
};

module.exports = {
    uploadToSupabaseStorage,
    getPublicUrl,
    deleteFile
};
