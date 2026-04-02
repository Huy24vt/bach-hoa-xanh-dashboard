# Store Incentive & Operations Performance Dashboard

Static portfolio dashboard built with HTML, CSS, and JavaScript for GitHub Pages deployment.

## Project goal

This mini project simulates a supermarket operations and incentive policy environment. It is designed to showcase analytics work relevant to retail operations analyst and incentive/policy analyst roles.

## What the dashboard covers

- Revenue actual vs target
- Incentive payout by store
- Target attainment vs shrinkage trade-off
- Bonus index heatmap by store and month
- Daily revenue run-rate
- Store ranking table for benchmarking
- Explicit KPI-based payout logic

## Folder structure

```text
store_incentive_github_pages_project/
├── README.md
└── docs/
    ├── .nojekyll
    ├── index.html
    ├── styles.css
    ├── script.js
    └── data/
        ├── daily_operations.csv
        ├── monthly_incentive_summary.csv
        └── store_master.csv
```

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `store-incentive-dashboard`.
2. Upload the full contents of this project.
3. Make sure `docs/index.html` stays at the top level of the `docs` folder.
4. In GitHub: **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/docs**.
7. Save, wait for GitHub Pages to publish, then use the generated site URL in your CV and portfolio.

## Optional local preview

Because this dashboard fetches CSV files, preview it with a local server instead of opening `index.html` directly.

### Python

```bash
cd docs
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Suggested portfolio wording

Built a static operations dashboard with simulated multi-store retail data, translating KPI-based bonus policy into store-level payout logic and performance diagnostics for revenue, shrinkage, productivity, and compliance.
