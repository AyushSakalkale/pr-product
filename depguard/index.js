const axios = require('axios');
require('dotenv').config();

const { getGithubData } = require('./collectors/github');
const { getNpmData } = require('./collectors/npm');
const { getSecurityData } = require('./collectors/security');
const { calculateScore } = require('./scorer/score');
const { generateSummary } = require('./output/summarize');

/**
 * Extracts GitHub owner and repo from NPM registry data.
 */
function extractGithubInfo(data) {
    const repo = data.repository;
    if (!repo || typeof repo.url !== 'string') return null;
    
    // Handle various git URL formats
    const match = repo.url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (match) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
    return null;
}

async function main() {
    const packageName = process.argv[2];
    if (!packageName) {
        console.error('Please provide a package name. Usage: node index.js <package-name>');
        process.exit(1);
    }

    try {
        // Step 1: Initial NPM registry call to find GitHub info
        const registryUrl = `https://registry.npmjs.org/${packageName}`;
        const registryRes = await axios.get(registryUrl);
        const githubInfo = extractGithubInfo(registryRes.data);

        if (!githubInfo) {
            console.warn(`Could not find GitHub repository for ${packageName}. GitHub metrics will be skipped.`);
        }

        // Step 2: Call collectors in parallel
        const [githubData, npmData, securityData] = await Promise.all([
            githubInfo ? getGithubData(githubInfo.owner, githubInfo.repo) : Promise.resolve(null),
            getNpmData(packageName),
            getSecurityData(packageName)
        ]);

        // Step 3: Calculate Scores
        const scores = calculateScore(githubData, npmData, securityData);

        // Step 4: Generate Summary
        const summary = generateSummary(scores, githubData || {}, npmData || {}, securityData || {});

        // Step 5: Output Results
        console.log(`\nPackage: ${packageName}`);
        console.log(`Final Score: ${scores.finalScore}`);
        console.log(`Status: ${scores.label}`);
        console.log('----------------------------');
        console.log(`Maintenance Score: ${scores.maintenanceScore}`);
        console.log(`Adoption Score:    ${scores.adoptionScore}`);
        console.log(`Security Score:    ${scores.securityScore}`);
        console.log(`Stability Score:   ${scores.stabilityScore}`);
        console.log(`License Score:     ${scores.licenseScore}`);
        console.log('----------------------------\n');
        console.log(summary);
        console.log('\n');

    } catch (error) {
        console.error(`An error occurred while analyzing ${packageName}:`, error.message);
        process.exit(1);
    }
}

main();
