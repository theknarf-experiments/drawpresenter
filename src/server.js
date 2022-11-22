const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin');
const withVanillaExtract = createVanillaExtractPlugin();

const start = (projectFile, dev = false, hostname = 'localhost', port = 3000) => {
	// when using middleware `hostname` and `port` must be provided below
	const app = next({
		dev,
		dir: __dirname,
		hostname,
		port,
		conf: withVanillaExtract({
			env: {
				projectFile
			},
			webpack: (config, { isServer }) => {
				// Fixes npm packages that depend on `fs` module
				if (!isServer) {
					config.resolve.fallback.fs = false;
				}

				return config;
			},
		}),
	});
	const handle = app.getRequestHandler();

	app.prepare().then(() => {
		createServer(async (req, res) => {
			try {
				// Be sure to pass `true` as the second argument to `url.parse`.
				// This tells it to parse the query portion of the URL.
				const parsedUrl = parse(req.url, true);
				const { pathname, query } = parsedUrl;

				if (pathname === '/a') {
					await app.render(req, res, '/a', query);
				} else if (pathname === '/b') {
					await app.render(req, res, '/b', query);
				} else {
					await handle(req, res, parsedUrl);
				}
			} catch (err) {
				console.error('Error occurred handling', req.url, err);
				res.statusCode = 500;
				res.end('internal server error');
			}
		}).listen(port, (err) => {
			if (err) throw err;
			console.log(`> Ready on http://${hostname}:${port}`);
		});
	});
}

module.exports = start;
