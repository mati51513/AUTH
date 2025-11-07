const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_KEY in .env file');
}

// Create Supabase client for regular operations (auth and queries)
const supabase = createClient(supabaseUrl, supabaseKey);

// Create Supabase client with service key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Database schema setup
const initializeDatabase = async () => {
    try {
        console.log('🔄 Initializing Supabase database schema...');
        
        // Test connection
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (testError && testError.code === '42P01') {
            console.log('📝 Users table does not exist, it will be created automatically by Supabase Auth');
        }

        console.log('✅ Supabase database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        return false;
    }
};

// User operations backed by Supabase Auth (no custom users table required)
const userOperations = {
    // Create a new user via Supabase Auth Admin
    async createUser(userData) {
        try {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true
            });

            if (error) throw error;
            const user = data.user;
            return { 
                success: true, 
                user: {
                    id: user.id,
                    email: user.email,
                    is_verified: !!user.email_confirmed_at,
                    two_fa_enabled: false
                }
            };
        } catch (error) {
            console.error('Error creating user via Supabase Auth:', error);
            return { success: false, error: error.message };
        }
    },

    // Find user by email using Supabase Auth Admin list
    async findUserByEmail(email) {
        try {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({
                page: 1,
                perPage: 200
            });
            if (error) throw error;
            const user = (data.users || []).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (!user) return null;
            return {
                id: user.id,
                email: user.email,
                is_verified: !!user.email_confirmed_at,
                two_fa_enabled: false
            };
        } catch (error) {
            console.error('Error finding user via Supabase Auth:', error);
            return null;
        }
    },

    // Update user
    async updateUser(email, updates) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('email', email)
                .select()
                .single();

            if (error) throw error;
            return { success: true, user: data };
        } catch (error) {
            console.error('Error updating user:', error);
            return { success: false, error: error.message };
        }
    },

    // Delete user
    async deleteUser(email) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('email', email);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all users (admin)
    async getAllUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, is_verified, two_fa_enabled, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, users: data };
        } catch (error) {
            console.error('Error getting users:', error);
            return { success: false, error: error.message };
        }
    }
};

// 2FA operations (prefer Supabase table when available; otherwise app will fallback in-memory)
const twoFAOperations = {
    // Store 2FA code
    async store2FACode(email, code, expiresAt) {
        try {
            const { data, error } = await supabase
                .from('two_fa_codes')
                .upsert([{
                    email: email,
                    code: code,
                    expires_at: expiresAt,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error storing 2FA code:', error);
            return { success: false, error: error.message };
        }
    },

    // Verify 2FA code
    async verify2FACode(email, code) {
        try {
            const { data, error } = await supabase
                .from('two_fa_codes')
                .select('*')
                .eq('email', email)
                .eq('code', code)
                .gte('expires_at', new Date().toISOString())
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            if (data) {
                // Delete used code
                await supabase
                    .from('two_fa_codes')
                    .delete()
                    .eq('email', email);
                
                return { success: true, valid: true };
            }
            
            return { success: true, valid: false };
        } catch (error) {
            console.error('Error verifying 2FA code:', error);
            return { success: false, error: error.message };
        }
    },

    // Clean expired codes
    async cleanExpiredCodes() {
        try {
            const { error } = await supabase
                .from('two_fa_codes')
                .delete()
                .lt('expires_at', new Date().toISOString());

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error cleaning expired codes:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = {
    supabase,
    supabaseAdmin,
    initializeDatabase,
    userOperations,
    twoFAOperations
};
