/**
 * Calculates a multidimensional health score for a package.
 * 
 * @param {Object|null} githubData - Metrics from GitHub.
 * @param {Object|null} npmData - Metrics from NPM.
 * @param {Object|null} securityData - Metrics from OSV.
 * @returns {Object} - Sub-scores, final score, and health label.
 */
function calculateScore(githubData, npmData, securityData) {
    // Helper to safely get values
    const gh = githubData || {};
    const npm = npmData || {};
    const sec = securityData || {};

    // 1. Maintenance Score
    let maintenanceScore = 100;
    if (gh.isArchived) {
        maintenanceScore = 0;
    } else {
        const days = gh.daysSinceLastCommit || 0;
        if (days > 365) maintenanceScore -= 40;
        else if (days > 180) maintenanceScore -= 20;
        else if (days > 90) maintenanceScore -= 10;

        if (gh.openToClosedRatio > 0.5) maintenanceScore -= 15;
        if (gh.totalContributors < 3) maintenanceScore -= 10;
    }
    maintenanceScore = Math.max(0, maintenanceScore);

    // 2. Adoption Score
    let adoptionScore = 100;
    const weekly = npm.weeklyDownloads || 0;
    if (weekly < 1000) adoptionScore -= 40;
    else if (weekly < 10000) adoptionScore -= 20;

    const trend = npm.downloadTrend || 0;
    if (trend < 0) adoptionScore -= 20;
    if (trend < -30) adoptionScore -= 20;
    adoptionScore = Math.max(0, adoptionScore);

    // 3. Security Score
    let securityScore = 100;
    if (sec.hasUnpatchedVulnerabilities) {
        securityScore = 0;
    } else {
        securityScore -= (sec.criticalCount || 0) * 20;
        securityScore -= (sec.highCount || 0) * 10;
    }
    securityScore = Math.max(0, securityScore);

    // 4. Stability Score
    let stabilityScore = 100;
    const days = gh.daysSinceLastCommit || 0;
    const openIssues = gh.openIssuesCount || 0;
    const trendVal = npm.downloadTrend || 0;

    if (days > 365 && openIssues < 5 && trendVal > -10) {
        stabilityScore = 85;
    } else {
        const ratio = gh.openToClosedRatio || 0;
        stabilityScore -= (ratio * 50); // Subtract based on issue ratio
    }
    stabilityScore = Math.max(0, Math.min(100, stabilityScore));

    // 5. License Score
    let licenseScore = 40;
    const license = (npm.license || '').toUpperCase();
    if (license.includes('MIT') || license.includes('APACHE')) {
        licenseScore = 100;
    } else if (license.includes('ISC') || license.includes('BSD')) {
        licenseScore = 90;
    } else if (license.includes('GPL')) {
        licenseScore = 50;
    }
    if (!npm.license) licenseScore = 40;

    // Final Score Calculation
    let finalScore = Math.round(
        (securityScore * 0.35) +
        (maintenanceScore * 0.25) +
        (adoptionScore * 0.20) +
        (stabilityScore * 0.15) +
        (licenseScore * 0.05)
    );

    // Abandonment Penalties
    const notes = [];
    
    // Penalty A: High Legacy Adoption
    if (gh.daysSinceLastCommit > 500 && npm.weeklyDownloads > 100000) {
        finalScore -= 35;
        notes.push('Warning: This package has over 1 million weekly downloads but has not seen a commit in over 500 days. Those downloads reflect projects that added this dependency years ago and never removed it. There is no evidence of active maintenance.');
    }
    
    // Penalty B: Structural Risk (Stale for > 1000 days)
    if (gh.daysSinceLastCommit > 1000) {
        finalScore -= 20;
    }
    
    finalScore = Math.max(0, finalScore);

    // Hard Cap for Unpatched Vulnerabilities
    if (sec.hasUnpatchedVulnerabilities && securityScore === 0) {
        finalScore = Math.min(finalScore, 45);
    }

    const note = notes.join(' ');

    // Label determination
    let label = 'Critical Risk';
    if (finalScore > 75) label = 'Healthy';
    else if (finalScore > 50) label = 'Moderate Risk';
    else if (finalScore > 25) label = 'High Risk';

    return {
        maintenanceScore,
        adoptionScore,
        securityScore,
        stabilityScore,
        licenseScore,
        finalScore,
        label,
        note
    };
}

module.exports = { calculateScore };
