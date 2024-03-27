// Copyright 2023, Josh Mandzak & Swasti Mishra

const path = require("path");

module.exports = {
    "entry": "./index.js",
    "output": {
        "path": path.resolve("dist"),
        "filename": "bundle.js"
    },
    "devtool": "source-map",
    "mode": "development",
    // leader-line is very old code, so this is necessary to properly import it.
    // If you follow the documentation from leader-line, it says to include it as a <script> tag
    // However, ESLint cannot read this, so we do this so it can be imported in index.js
    "module": {
        "rules": [
            {
                test: path.resolve(__dirname, "node_modules/leader-line/"),
                use: [{
                    loader: "skeleton-loader",
                    options: {procedure: content => `${content}export default LeaderLine`}
                }]
            }
        ]
    }
}