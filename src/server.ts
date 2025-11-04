import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { openDocument, Document } from './document';

const start = async (projectFile: string, dev: boolean = false, hostname: string = 'localhost', port: number = 3000): Promise<void> => {
	// -- Setting up Next.js --

	// when using middleware `hostname` and `port` must be provided below
	const app = next({
		dev,
		dir: path.join(__dirname, '..'),
		hostname,
		port,
    turbo: false,
	});
  process.env.projectFile = projectFile;
	const handle = app.getRequestHandler();
	await app.prepare()

	// -- Setting up Express.js --

	const server = express();

	const projectPath = path.dirname(path.resolve(projectFile));
	console.log(projectPath);
	server.use('/files', express.static(projectPath))

  server.use('/doc', async (req: Request, res: Response, next: NextFunction) => {
    console.log(`/doc ${projectFile}`);
    const doc = await openDocument(projectFile);

    res.send(JSON.stringify({
      doc,
    }));
  });

	server.use(async (req: Request, res: Response, next: NextFunction) => {
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

  return new Promise(() => {}); // Keep the process running
}

export default start;
