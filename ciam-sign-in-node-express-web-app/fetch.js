const axios = require('axios');

const fetch = async (endpoint, accessToken) => {
    const options = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    };

    console.log(`request made to ${endpoint} at: ` + new Date().toString());

    try {
        const response = await axios.get(endpoint, options);
        return await response.data;
    } catch (error) {
        throw new Error(error);
    }
};

module.exports = { fetch };
