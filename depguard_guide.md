# 🛡️ DepGuard: Beginner's Guide to Security Automation

Welcome to DepGuard! This tool is designed to be your project's "Security Sentry." It automatically audits every external library (package) you add to your project to ensure you aren't accidentally introducing abandoned, unpopular, or vulnerable code.

## 🌟 What does this tool do?
Imagine you are building a house and buying parts from various suppliers. DepGuard acts as an inspector who checks:
1. **Is the supplier still in business?** (Maintenance Score)
2. **Do other builders trust them?** (Adoption Score)
3. **Are there known defects in their parts?** (Security Score)
4. **Is the part design stable or changing every week?** (Stability Score)

If the inspector finds a "Critical Risk," they stop the construction (fail the build) so you can fix it before the house is finished.

---

## ⚙️ How it Works (The Logic)

DepGuard doesn't just check for "bugs." It looks at the **health** of the software ecosystem.

### 1. The Multi-Factor Scoring Engine
Every package gets a score from **0 to 100**.
- **90+ (Healthy)**: Professional-grade, active, and safe.
- **50-80 (Moderate)**: Generally safe but might have minor issues (like being slightly old).
- **25-50 (High Risk)**: Significant red flags (abandoned or unpatched bugs).
- **< 25 (Critical)**: Dangerous. Likely contains exploitable vulnerabilities or total abandonment.

### 2. The "Hard Caps" (The Deal-Breakers)
Some things are so bad that no amount of popularity can save them. 
- **Unpatched Vulnerabilities**: If a package has a known security hole that the author hasn't fixed, DepGuard **caps the score at 45**, marking it as High Risk immediately, even if it has a billion downloads.
- **Abandonment Penalty**: If a package hasn't been updated in over 500 days but still has huge downloads (like `left-pad`), it gets a massive penalty. This prevents "legacy disasters."

---

## 🤖 The Automation Pipeline (GitHub Actions)

When you open a "Pull Request" (PR) to add new code, DepGuard runs **two specific jobs** in the cloud:

### Job 1: `analyze` (The Focused Specialist)
- **What it does**: It looks only at the specific packages you just added or changed in your `package.json`.
- **Goal**: Immediate feedback on your direct choices.
- **Failure**: If any package you added scores **below 50**, this job fails and blocks the PR.

### Job 2: `tree-scan` (The Big Picture)
- **What it does**: It looks at your **entire project**, including the "dependencies of dependencies" (transitive dependencies).
- **Why?**: You might add a "Healthy" package that secretly relies on a "Critical" one. This job finds those hidden dangers.
- **Logic**: It automatically selects "No" to the interactive prompt (to save time) and generates a visual report.
- **Failure**: If it finds a **transitive** dependency with a score **below 25**, it fails the build. We are stricter here because you didn't choose these packages directly.

---

## 📁 Project Structure for Beginners

- `depguard/collectors/`: The "Eyes" of the tool. They go out to the internet to get data.
- `depguard/scorer/`: The "Brain." It does the math.
- `depguard/output/`: The "Voice." It writes the reports you see in the terminal and on GitHub.
- `depguard/scan.js`: The "Orchestrator." It runs the full project-wide audit.
- `.github/workflows/depguard.yml`: The "Instruction Manual" for GitHub on when and how to run the tool.

## 🚀 How to use it locally
If you want to check a package before adding it:
```bash
node depguard/index.js <package-name>
```

If you want to scan your whole project:
```bash
node depguard/scan.js
```
