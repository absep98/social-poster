const axios = require('axios');

// Updated LinkedIn Service to use user-provided credentials instead of env variables

// Generate authorization URL with user's client ID
const getAuthorizationUrl = (clientId, redirectUri = 'http://localhost:5001/auth/linkedin/callback') => {
    if (!clientId) {
        throw new Error('LinkedIn Client ID is required');
    }

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email w_member_social', // Current LinkedIn scopes
        state: 'random_string_here',
    });

    const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    console.log('🔗 Generated LinkedIn authorization URL:', url);
    return url;
};

// Exchange authorization code for access token using user's credentials
const exchangeCodeForAccessToken = async (code, clientId, clientSecret, redirectUri = 'http://localhost:5001/auth/linkedin/callback') => {
    if (!clientId || !clientSecret) {
        throw new Error('LinkedIn Client ID and Client Secret are required');
    }

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
    });

    try {
        console.log('Exchanging code for token with user credentials...');

        const response = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            params.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        // LinkedIn tokens typically expire after 60 days (5184000 seconds)
        const tokenData = response.data;
        const expiresIn = tokenData.expires_in || 5184000; // default 60 days
        const expiryDate = new Date(Date.now() + (expiresIn * 1000));

        return {
            accessToken: tokenData.access_token,
            expiresIn: expiresIn,
            expiryDate: expiryDate,
            tokenType: tokenData.token_type || 'Bearer'
        };
    } catch (error) {
        console.error('❌ Failed to exchange code for token:', error.response?.data || error.message);
        throw error;
    }
};

// *** UPDATED FUNCTION: Get User Info using OpenID Connect ***
const getUserInfo = async (accessToken) => {
    try {
        // *** CHANGE 2: Use the /v2/userinfo endpoint for OpenID Connect compliant user data ***
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ User Info received:', response.data);
        
        // Extract the person ID from the 'sub' field
        // The 'sub' field format is typically a URL or URN
        const userUrn = response.data.sub;
        
        // If the sub contains a full URN, extract just the ID
        // Format might be: "urn:li:person:ABC123" or just "ABC123"
        const personId = userUrn.includes(':') ? userUrn.split(':').pop() : userUrn;
        
        return {
            id: personId,
            name: response.data.name,
            email: response.data.email,
            picture: response.data.picture,
            fullUrn: userUrn
        };
    } catch (error) {
        console.error('❌ Failed to get user info:', error.response?.data || error.message);
        throw error;
    }
};

// *** ALTERNATIVE: Fallback method if userinfo doesn't work ***
const getUserInfoFallback = async (accessToken) => {
    try {
        // Try the legacy endpoint as fallback
        const response = await axios.get('https://api.linkedin.com/v2/people/~', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        
        console.log('✅ User Info (fallback) received:', response.data);
        return {
            id: response.data.id,
            name: `${response.data.firstName?.localized?.en_US || ''} ${response.data.lastName?.localized?.en_US || ''}`.trim(),
            fullUrn: response.data.id
        };
    } catch (error) {
        console.error('❌ Failed to get user info (fallback):', error.response?.data || error.message);
        throw error;
    }
};

// Post a text update to LinkedIn using user's access token
const postToLinkedIn = async (text, accessToken, profileId) => {
    if (!accessToken) {
        throw new Error('LinkedIn access token is missing');
    }

    try {
        // If profileId is provided, use it directly; otherwise try to get user info
        let authorUrn;
        
        if (profileId) {
            authorUrn = profileId.startsWith('urn:li:person:') 
                ? profileId 
                : `urn:li:person:${profileId}`;
        } else {
            // Fallback: get user info if profileId not provided
            let userInfo;
            try {
                userInfo = await getUserInfo(accessToken);
            } catch (primaryError) {
                console.log('Primary getUserInfo failed, trying fallback method...');
                userInfo = await getUserInfoFallback(accessToken);
            }

            if (!userInfo || !userInfo.id) {
                throw new Error('Could not retrieve authenticated user information for posting. Please provide Profile ID in settings.');
            }

            authorUrn = userInfo.fullUrn.startsWith('urn:li:person:') 
                ? userInfo.fullUrn 
                : `urn:li:person:${userInfo.id}`;
        }
            
        console.log('Attempting to post with author URN:', authorUrn);

        const response = await axios.post(
            'https://api.linkedin.com/v2/ugcPosts',
            {
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: text
                        },
                        shareMediaCategory: 'NONE',
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('LinkedIn post successful:', response.data);
        return response.data;
    } catch (err) {
        console.error('LinkedIn post failed:', err.response?.data || err.message);

        if (err.response?.status === 403) {
            throw new Error('LinkedIn API access denied. Ensure your app has correct scopes (w_member_social, openid, profile, email) and proper permissions.');
        }

        if (err.response?.status === 401) {
            throw new Error('LinkedIn access token is invalid or expired.');
        }

        if (err.response?.status === 426) {
            throw new Error('LinkedIn API version issue.');
        }

        throw err;
    }
};

// *** NEW FUNCTION: Test connection with current scopes ***
const testLinkedInConnection = async (accessToken) => {
    try {
        const userInfo = await getUserInfo(accessToken);
        console.log('✅ LinkedIn connection test successful:', userInfo);
        return userInfo;
    } catch (error) {
        console.error('❌ LinkedIn connection test failed:', error.message);
        throw error;
    }
};

// *** NEW FUNCTION: Get available scopes for debugging ***
const getAvailableScopes = () => {
    return [
        'openid',           // OpenID Connect
        'profile',          // Basic profile info
        'email',            // Email address
        'w_member_social'   // Post updates
    ];
};

// Check if LinkedIn token is still valid
const isTokenValid = async (accessToken) => {
    if (!accessToken) return false;
    
    try {
        // Try a simple API call to check token validity
        await getUserInfo(accessToken);
        return true;
    } catch (error) {
        // If we get 401, token is invalid/expired
        if (error.response?.status === 401) {
            return false;
        }
        // For other errors, assume token might still be valid
        console.warn('Token validation unclear:', error.message);
        return false;
    }
};

// Check if token is expired based on stored expiry date
const isTokenExpired = (expiryDate) => {
    if (!expiryDate) return true;
    return new Date() >= new Date(expiryDate);
};

module.exports = {
    getAuthorizationUrl,
    exchangeCodeForAccessToken,
    postToLinkedIn,
    getUserInfo,
    testLinkedInConnection,
    getAvailableScopes,
    isTokenValid,
    isTokenExpired
};