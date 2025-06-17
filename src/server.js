const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const express = require('express');
const { openDocument } = require('./document');

const start = async (projectFile, dev = false, hostname = 'localhost', port = 3000) => {
	// -- Setting up Next.js --

	// when using middleware `hostname` and `port` must be provided below
	const app = next({
		dev,
		dir: __dirname,
		hostname,
		port,
    turbo: false,
	});
  process.env.projectFile = projectFile;
	const handle = app.getRequestHandler();
	await app.prepare()

	// -- Setting up Express.js --

	const server = express();

	const projectPath = path.dirname(projectFile);
	console.log(projectPath);
	server.use('/files', express.static(projectPath))

  server.use('/doc', async (req, res, next) => {
    console.log(`/doc ${projectFile}`);
    const doc = await openDocument(projectFile);

    res.send(JSON.stringify({
      doc,
    }));
  });

	server.use(async (req, res, next) => {
		try {
			const parsedUrl = parse(req.url, true);
			const { pathname, query } = parsedUrl;

			await handle(req, res, parsedUrl);
		} catch (err) {
			console.error('Error occurred handling', req.url, err);
			res.statusCode = 500;
			res.end('A problem occured - internal server error');
		}
	});

	server.listen(port, (err) => {
		if (err) throw err;
		console.log(`> Ready on http://${hostname}:${port}`);
	});
}

module.exports = start;
