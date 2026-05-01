const axios = require('axios');
const { trackRequest } = require('../utils/rateLimiter');

/**
 * Fetches repository data from GitHub Public REST API.
 * 
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @returns {Promise<Object|null>} - Object with repo metrics or null on failure.
 */
async function getGithubData(owner, repo) {
    try {
        await trackRequest();
        const token = process.env.GITHUB_PAT || process.env.HUB_PAT || process.env.GITHUB_TOKEN;

        const config = {
            headers: {
                'User-Agent': 'depguard-app',
                'Authorization': token ? `token ${token}` : undefined
            }
        };

        // 1. Fetch Repository Base Info
        const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const repoRes = await axios.get(repoUrl, config);
        const { archived, open_issues_count, full_name } = repoRes.data;

        // Use the actual full_name (handles redirects/renames)
        const [actualOwner, actualRepo] = full_name.split('/');

        // 2. Fetch Last Commit Date
        const commitsUrl = `https://api.github.com/repos/${actualOwner}/${actualRepo}/commits?per_page=1`;
        const commitsRes = await axios.get(commitsUrl, config);
        const lastCommitDate = commitsRes.data[0]?.commit?.committer?.date;

        // 3. Fetch Total Contributors Count (using Link header hack)
        const contributorsUrl = `https://api.github.com/repos/${actualOwner}/${actualRepo}/contributors?per_page=1&anon=true`;
        const contributorsRes = await axios.get(contributorsUrl, config);
        const totalContributors = getCountFromLinkHeader(contributorsRes.headers.link) || (contributorsRes.data.length > 0 ? 1 : 0);

        // 4. Use open_issues_count from repo endpoint (free)
        const openIssuesCount = open_issues_count;
        const closedIssuesCount = 0; // Removing separate Search API call


        // Calculations
        const now = new Date();
        const lastCommit = new Date(lastCommitDate);
        const diffTime = Math.abs(now - lastCommit);
        const daysSinceLastCommit = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const openToClosedRatio = closedIssuesCount > 0 
            ? parseFloat((openIssuesCount / closedIssuesCount).toFixed(2)) 
            : 0;

        return {
            lastCommitDate,
            totalContributors,
            openIssuesCount,
            closedIssuesCount,
            isArchived: archived,
            daysSinceLastCommit,
            openToClosedRatio
        };

    } catch (error) {
        console.error(`Error fetching data for ${owner}/${repo}:`, error.message);
        if (error.response) console.error('Response Data:', error.response.data);
        return null;
    }
}

/**
 * Helper to extract the total count from GitHub's Link header.
 * GitHub uses pagination links like: <url?page=2>; rel="next", <url?page=100>; rel="last"
 */
function getCountFromLinkHeader(linkHeader) {
    if (!linkHeader) return null;
    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1], 10) : null;
}

module.exports = { getGithubData };

// Test call
if (require.main === module) {
    getGithubData('facebook', 'react').then(data => {
        console.log('GitHub Data for facebook/react:');
        console.log(JSON.stringify(data, null, 2));
    });
}
