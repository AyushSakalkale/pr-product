/**
 * Generates a human-readable summary of the package health assessment.
 * 
 * @param {Object} scores - The result from calculateScore.
 * @param {Object} githubData - Raw GitHub metrics.
 * @param {Object} npmData - Raw NPM metrics.
 * @param {Object} securityData - Raw OSV metrics.
 * @returns {string} - A concise summary paragraph.
 */
function generateSummary(scores, githubData, npmData, securityData) {
    const { finalScore, label } = scores;
    const isHealthy = finalScore > 75;
    
    let summary = '';

    if (isHealthy) {
        summary = `This package is healthy with a final score of ${finalScore}. `;
        
        const commitInfo = githubData.daysSinceLastCommit !== undefined 
            ? `last commit ${githubData.daysSinceLastCommit} days ago` 
            : 'stable maintenance';
            
        const securityInfo = securityData.totalVulnerabilities > 0 
            ? `a few noted vulnerabilities (${securityData.totalVulnerabilities} total)` 
            : 'a clean security profile with zero vulnerabilities';

        summary += `It shows ${commitInfo} and ${securityInfo}. `;
        summary += `The high adoption rate of ${npmData.weeklyDownloads.toLocaleString()} weekly downloads confirms its reliability in the ecosystem. `;
        
        if (securityData.totalVulnerabilities > 3) {
            summary += `While generally healthy, you should proceed with caution and verify that the ${securityData.totalVulnerabilities} identified vulnerabilities do not affect our specific implementation.`;
        } else {
            summary += `You should confidently proceed with this dependency for our project.`;
        }
    } else {
        summary = `This package represents a ${label} to our codebase with a score of ${finalScore}. `;
        
        const reasons = [];
        if (securityData.totalVulnerabilities > 0) {
            reasons.push(`${securityData.totalVulnerabilities} total vulnerabilities including ${securityData.criticalCount} critical issues`);
        }
        if (githubData.daysSinceLastCommit > 180) {
            reasons.push(`stale maintenance with no commits in ${githubData.daysSinceLastCommit} days`);
        }
        if (npmData.downloadTrend < -20) {
            reasons.push(`a declining download trend of ${npmData.downloadTrend}%`);
        }
        if (githubData.isArchived) {
            reasons.push(`the repository being officially archived`);
        }

        summary += `The primary concerns are ${reasons.join(' and ')}. `;
        
        if (securityData.hasUnpatchedVulnerabilities) {
            summary += `Crucially, there are unpatched security flaws that pose an immediate threat. `;
        }

        summary += `You should immediately evaluate a more secure alternative or plan for a local fork to mitigate these risks.`;
    }

    if (scores.note) {
        summary += ` ${scores.note}`;
    }

    return summary;
}

module.exports = { generateSummary };
