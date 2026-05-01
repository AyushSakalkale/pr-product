const fs = require('fs');
const path = require('path');
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
 */
async function scoreTree(packages, concurrency = 2) {
    // Read ignored packages from .depguardignore
    let ignoredPackages = [];
    try {
        const ignorePath = path.join(__dirname, '../.depguardignore');
        if (fs.existsSync(ignorePath)) {
            ignoredPackages = fs.readFileSync(ignorePath, 'utf8')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }
    } catch (err) {
        // Silently continue if file can't be read
    }

    const initialCount = packages.length;
    const filteredPackages = packages.filter(pkg => !ignoredPackages.includes(pkg.name));
    const skipCount = initialCount - filteredPackages.length;

    if (skipCount > 0) {
        console.log(`Skipping ${skipCount} packages listed in .depguardignore`);
    }

    // Dynamic import for p-limit to support ESM in CJS
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(concurrency);
    const total = filteredPackages.length;
    let completed = 0;

    const tasks = filteredPackages.map(pkg => {
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
