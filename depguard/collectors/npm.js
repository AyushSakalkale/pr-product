const axios = require('axios');

/**
 * Fetches package data from NPM Registry and Downloads API.
 * 
 * @param {string} packageName - The name of the npm package.
 * @returns {Promise<Object|null>} - Object with npm metrics or null on failure.
 */
async function getNpmData(packageName) {
    try {
        // 1. Fetch Basic Metadata (Last Published, Versions, License)
        const registryUrl = `https://registry.npmjs.org/${packageName}`;
        const registryRes = await axios.get(registryUrl);
        const data = registryRes.data;

        const lastPublishedDate = data.time?.modified;
        const totalVersions = data.versions ? Object.keys(data.versions).length : 0;
        const license = data.license || (data.versions && Object.values(data.versions).pop()?.license) || 'Unknown';

        // 2. Fetch Download Counts (Weekly & Monthly)
        const weeklyUrl = `https://api.npmjs.org/downloads/point/last-week/${packageName}`;
        const monthlyUrl = `https://api.npmjs.org/downloads/point/last-month/${packageName}`;
        
        const [weeklyRes, monthlyRes] = await Promise.all([
            axios.get(weeklyUrl),
            axios.get(monthlyUrl)
        ]);

        const weeklyDownloads = weeklyRes.data.downloads;
        const monthlyDownloads = monthlyRes.data.downloads;

        // 3. Fetch Download Trend (Compare current 30 days with previous 30 days)
        // We'll fetch the last 60 days of data to calculate the trend
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];
        
        const rangeUrl = `https://api.npmjs.org/downloads/range/${sixtyDaysAgo}:${todayStr}/${packageName}`;
        const rangeRes = await axios.get(rangeUrl);
        const dailyDownloads = rangeRes.data.downloads;

        // Split into two 30-day buckets
        const current30 = dailyDownloads.slice(-30).reduce((sum, d) => sum + d.downloads, 0);
        const previous30 = dailyDownloads.slice(-60, -30).reduce((sum, d) => sum + d.downloads, 0);
        
        const downloadTrend = previous30 > 0 
            ? parseFloat((((current30 - previous30) / previous30) * 100).toFixed(2))
            : 0;

        // 4. Fetch Dependent Count
        // Using the search API to find packages that depend on this one
        const dependentUrl = `https://registry.npmjs.org/-/v1/search?text=depends-on:${packageName}&size=0`;
        const dependentRes = await axios.get(dependentUrl);
        const dependentCount = dependentRes.data.total || 0;

        return {
            weeklyDownloads,
            monthlyDownloads,
            downloadTrend,
            dependentCount,
            lastPublishedDate,
            totalVersions,
            license
        };

    } catch (error) {
        // console.error(`Error fetching NPM data for ${packageName}:`, error.message);
        return null;
    }
}

module.exports = { getNpmData };

// Test call
if (require.main === module) {
    getNpmData('lodash').then(data => {
        console.log('NPM Data for lodash:');
        console.log(JSON.stringify(data, null, 2));
    });
}
