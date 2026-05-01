const axios = require('axios');

/**
 * Fetches security vulnerability data from OSV API.
 * 
 * @param {string} packageName - The name of the npm package.
 * @returns {Promise<Object|null>} - Object with security metrics or null on failure.
 */
async function getSecurityData(packageName) {
    try {
        const url = 'https://api.osv.dev/v1/query';
        const body = {
            package: {
                name: packageName,
                ecosystem: 'npm'
            }
        };

        const response = await axios.post(url, body);
        const vulns = response.data.vulns || [];

        let criticalCount = 0;
        let highCount = 0;
        let hasUnpatchedVulnerabilities = false;
        let mostRecentVulnerabilityDate = null;

        vulns.forEach(vuln => {
            // 1. Severity Counts
            const severity = vuln.database_specific?.severity;
            if (severity === 'CRITICAL') criticalCount++;
            if (severity === 'HIGH') highCount++;

            // 2. Unpatched Check
            // A vulnerability is unpatched if no 'fixed' event exists in any affected range
            let isFixed = false;
            if (vuln.affected) {
                vuln.affected.forEach(affectedItem => {
                    if (affectedItem.ranges) {
                        affectedItem.ranges.forEach(range => {
                            if (range.events && range.events.some(event => event.fixed)) {
                                isFixed = true;
                            }
                        });
                    }
                });
            }
            if (!isFixed && vuln.affected && vuln.affected.length > 0) {
                hasUnpatchedVulnerabilities = true;
            }

            // 3. Most Recent Date
            const publishedDate = vuln.published;
            if (!mostRecentVulnerabilityDate || new Date(publishedDate) > new Date(mostRecentVulnerabilityDate)) {
                mostRecentVulnerabilityDate = publishedDate;
            }
        });

        return {
            totalVulnerabilities: vulns.length,
            criticalCount,
            highCount,
            hasUnpatchedVulnerabilities,
            mostRecentVulnerabilityDate
        };

    } catch (error) {
        // console.error(`Error fetching security data for ${packageName}:`, error.message);
        return null;
    }
}

module.exports = { getSecurityData };

// Test call
if (require.main === module) {
    getSecurityData('lodash').then(data => {
        console.log('Security Data for lodash:');
        console.log(JSON.stringify(data, null, 2));
    });
}
