# CatalogVisualizer
Web application to generate flowchart-like graphics for university degrees. Written for EECS @ UTK.

## Building
First, make sure you have [Node.js](https://nodejs.org/en/download) installed on your machine. This was written using Node version `20.10.0` as of 3/29/24. Please update this README if you commit changes with a newer version of Node.

### For EECS deployment
As this was written for EECS, these instructions are for our own "webhome" infrastructure. More generic instructions will follow.

First, clone it to your webhome directory. If you want it to be on a subpage, put it in a subdirectory. For example, if you wish to host at https://web.eecs.utk.edu/~netid/Visualizer, run the following:
```sh
git clone git@github.com:bepri/Catalog-Visualizer.git $HOME/webhome/Visualizer
cd !$
make build
```

This results in all the static files you need. By default, the Makefile's `build` recipe will set the appropriate permissions for webhome. However, if this website is ever updated to need any sort of write access, these will need changes. Contact EECS IT for help with this.

A target for updating all of the packages used to build the server exists too:
```sh
make update
```

This target also rebuilds the website, so no need to do that every time.

### For other deployments
If you'd like to deploy this for yourself, the above directions _mostly_ work fine. However, in lieu of the EECS "webhome" infrastructure mentioned above, you will need to configure your own web server. This website does not have any sort of backend, CGI scripts, or other complicated tools at the moment so a very minimal solution is sufficient. After building, simply point your web server to `index.html` and you should be good.

Make sure that only the _static_ files (`dist/`, `catalogs.json`, `stylesheet.css`, `index.html`) are visible to your web server so files such as `package-lock.json` don't end up visible from the internet. It is recommended to either use file permissions to restrict visibility, or move these static files to their own directory for the web server.

## Maintaining
This repository includes a `.prettierrc` and `.eslintrc.js` to help with consistency and debugging. Try to use these tools to keep the code clean.

### Starting the development environment
To start a hot-reloadable webpage to test changes as you code, run `make dev`. The resulting local web server can be stopped with `make dev_stop`. Log files for both the build process and the web server can be found in `dev/`. The environment assumes you have a Linux-like environment, so WSL is recommended for maintainers using Windows.

### Updating `catalogs.json`
The catalog file is where all of the data for the website lives. It uses a defined structure to represent a graph of classes for the website to render. A skeleton schema with comments can be found below.
```json
{
    "cs_2023": { // Name of the catalog. No format is enforced right now for this.
        "nodes": { // The "nodes" key will contain one node for each class
            "cs101": { // This key is only used under the hood, but a descriptive key helps a lot with debugging.
                "hours": 3, // Credit hours for the course
                "title": "COSC 101 - Introduction to Programming", // Full title of the course
                "term": 1 // The semester this class is expected to be taken
            },
            "ef151": {
                "hours": 4,
                "title": "EF 151/157 - Physics for Engineers I", // Use a slash and list the other course code if an honor's section is available
                "term": 1
            },
            "ef152": {
                "hours": 3,
                "title": "EF 152/158 - Physics for Engineers II",
                "term": 2
            },
            "second_term_hum": { // When in doubt, try to be descriptive for course slots that have many choices, such as electives or gen-eds
                "hours": 3,
                "title": "Arts and Humanities Elective",
                "term": 2
            },
            ...
        },
        "edges": { // Here is where we connect the nodes defined above
            "prerequisites": [
                ["ef151", "ef152"], // For prerequisites, always list the earlier of the two courses first
                ...
            ],
            "corequisites": [
                ["cosc101", "ef151"], // For corequisites, order does not matter
                ...
            ]
        }
    },
    "ce_2023": { // Just add more of these for each catalog you want to support
        ...
    }
}
```

Initial release is copyright 2023, Josh Mandzak & Swasti Mishra
Contributors: Imani Pelton (imani (at) bepri (dot) dev)
