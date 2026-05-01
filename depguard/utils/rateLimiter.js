let requestCount = 0;
let windowStart = Date.now();

async function trackRequest() {
    requestCount += 1;
    const elapsed = Date.now() - windowStart;

    if (requestCount > 40 && elapsed < 60000) {
        const remainingTime = 60000 - elapsed;
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        requestCount = 0;
        windowStart = Date.now();
    } else if (elapsed >= 60000) {
        requestCount = 0;
        windowStart = Date.now();
    }
}

module.exports = { trackRequest };
