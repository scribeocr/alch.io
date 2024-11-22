# Alch.io
Alch.io is a web application for extracting tabular data from scanned documents and PDF files.  After importing a series of images or PDF document to alch.io, users can recognize text (if needed), select and edit regions containing tables, and export those tables as an Excel file.

# Running
Alch.io can be run by using the public site at [alch.io](https://alch.io).  The entire program runs in your browser--your documents are not sent to a remote server. 

There is currently no standalone desktop application, so running locally requires serving the files over a local HTTP server.  For example, the commands below host the site locally using `http-server` (requires [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)):
```
git clone --recursive https://github.com/scribeocr/alch.io.git
cd alch.io
npm i
npx http-server
```
The `npx http-server` command will print the address on your local network that alch.io is running on.  You can use the site by visiting that address.

# Codebase Overview
This repo only contains code specific to the alch.io web application.  This consists primarily of handling user interaction with UI elements.  The vast majority of the code--including code related to extracting text, recognizing text, exporting text, and displaying the document--comes from the Scribe.js and Scribe UI libraries.

1. Scribe.js (repo [here](https://github.com/scribeocr/scribe.js/tree/master)) - provides all non-UI logic (extracting text, recognizing text, etc.)
2. Scribe UI (repo [here](https://github.com/scribeocr/scribe-ui/tree/master)) - wraps Scribe.js and provides a PDF viewer that supports editing text and layout elements.