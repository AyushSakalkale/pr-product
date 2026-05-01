const { getGithubData } = require('../collectors/github');
const { getNpmData } = require('../collectors/npm');
const { getSecurityData } = require('../collectors/security');
const { calculateScore } = require('./score');

/**
 * Extracts GitHub owner and repo from NPM repository metadata.
 */
function extractGithubInfo(repository) {
    if (!repository || typeof repository.url !== 'string') return null;
    const match = repository.url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (match) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
    return null;
}

/**
 * Scores an array of packages with concurrency limiting.
 * 
 * @param {Array} packages - Flat array of package objects from getDependencyTree.
 * @param {number} concurrency - Max simultaneous API requests.
 * @returns {Promise<Array>} - Array of scored package objects.
 */
async function scoreTree(packages, concurrency = 5) {
    // Dynamic import for p-limit to support ESM in CJS
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(concurrency);
    const total = packages.length;
    let completed = 0;

    const tasks = packages.map(pkg => {
        return limit(async () => {
            try {
                const npmData = await getNpmData(pkg.name);
                const githubInfo = npmData ? extractGithubInfo(npmData.repository) : null;

                const [githubData, securityData] = await Promise.all([
                    githubInfo ? getGithubData(githubInfo.owner, githubInfo.repo) : Promise.resolve(null),
                    getSecurityData(pkg.name)
                ]);

                const scores = calculateScore(githubData, npmData, securityData);

                completed++;
                process.stdout.write(`\rProgress: ${completed}/${total} packages scored...`);

                return {
                    ...pkg,
                    finalScore: scores.finalScore,
                    label: scores.label,
                    maintenanceScore: scores.maintenanceScore,
                    adoptionScore: scores.adoptionScore,
                    securityScore: scores.securityScore,
                    stabilityScore: scores.stabilityScore,
                    licenseScore: scores.licenseScore
                };
            } catch (error) {
                completed++;
                process.stdout.write(`\rProgress: ${completed}/${total} packages scored...`);
                return {
                    ...pkg,
                    finalScore: null,
                    label: 'Unknown',
                    error: error.message
                };
            }
        });
    });

    const results = await Promise.all(tasks);
    process.stdout.write('\nScoring complete.\n');
    return results;
}

module.exports = { scoreTree };

// Test it if run directly
if (require.main === module) {
    require('dotenv').config();
    const testPackages = [
        { name: 'express', version: '4.18.2', depth: 0 },
        { name: 'lodash', version: '4.17.21', depth: 0 },
        { name: 'colors', version: '1.4.0', depth: 0 },
        { name: 'left-pad', version: '1.3.0', depth: 0 },
        { name: 'event-stream', version: '3.3.4', depth: 0 }
    ];

    scoreTree(testPackages).then(results => {
        console.log(JSON.stringify(results, null, 2));
    });
}
