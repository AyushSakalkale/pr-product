/**
 * Generates a structured risk report from a scored dependency tree.
 * 
 * @param {Array} packages - Array of scored package objects.
 * @returns {Object} - Structured report data.
 */
function generateTreeReport(packages) {
    const scored = packages.filter(p => p.finalScore !== null);
    const totalPackages = packages.length;
    const scoredCount = scored.length;

    const criticalPackages = scored.filter(p => p.finalScore < 25);
    const highRiskPackages = scored.filter(p => p.finalScore >= 25 && p.finalScore < 50);
    const transitiveRisks = scored.filter(p => !p.isDirect && p.finalScore < 50);

    let worstPackage = null;
    if (scoredCount > 0) {
        worstPackage = scored.reduce((prev, curr) => (prev.finalScore < curr.currScore) ? prev : curr);
        // Correcting the reduce logic
        worstPackage = scored.reduce((min, p) => (p.finalScore < min.finalScore ? p : min), scored[0]);
    }

    const sumScore = scored.reduce((sum, p) => sum + p.finalScore, 0);
    const averageScore = scoredCount > 0 ? parseFloat((sumScore / scoredCount).toFixed(1)) : 0;

    let riskSurface = 'Unknown';
    if (scoredCount > 0) {
        if (averageScore > 80) riskSurface = 'Clean';
        else if (averageScore > 60) riskSurface = 'Moderate';
        else if (averageScore > 40) riskSurface = 'Elevated';
        else riskSurface = 'Critical';
    }

    return {
        totalPackages,
        scoredPackages: scoredCount,
        criticalPackages,
        highRiskPackages,
        transitiveRisks,
        worstPackage,
        averageScore,
        riskSurface
    };
}

module.exports = { generateTreeReport };

// Test it if run directly
if (require.main === module) {
    const fakePackages = [
        { name: 'safe-pkg', finalScore: 95, isDirect: true },
        { name: 'vulnerable-direct', finalScore: 40, isDirect: true },
        { name: 'vulnerable-transitive', finalScore: 10, isDirect: false },
        { name: 'moderate-transitive', finalScore: 45, isDirect: false },
        { name: 'unscored-pkg', finalScore: null, isDirect: false }
    ];

    const report = generateTreeReport(fakePackages);
    console.log(JSON.stringify(report, null, 2));
}
