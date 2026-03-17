import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { openDocument, addSlideAfter } from './document';

const start = async (projectFile: string, dev: boolean = false, hostname: string = 'localhost', port: number = 3000): Promise<void> => {
	const server = express();

	const projectPath = path.dirname(path.resolve(projectFile));
	console.log(projectPath);
	server.use('/files', express.static(projectPath));

	server.use(express.json());

	server.get('/doc', async (req: Request, res: Response) => {
		console.log(`/doc ${projectFile}`);
		const doc = await openDocument(projectFile);

		res.json({ doc });
	});

	server.post('/doc/add-slide', async (req: Request, res: Response) => {
		const { afterIndex } = req.body;
		const doc = await addSlideAfter(projectFile, afterIndex);

		res.json({ doc });
	});

	if (dev) {
		const { createServer: createViteServer } = await import('vite');
		const vite = await createViteServer({
			server: { middlewareMode: true },
			root: path.join(__dirname, '..', 'src'),
			configFile: path.join(__dirname, '..', 'vite.config.ts'),
		});
		server.use(vite.middlewares);
	} else {
		const distPath = path.join(__dirname, '..', 'dist');
		server.use(express.static(distPath));
	}

	// SPA fallback — serve index.html for all unmatched routes
	server.get('*', (req: Request, res: Response) => {
		const indexPath = dev
			? path.join(__dirname, '..', 'src', 'index.html')
			: path.join(__dirname, '..', 'dist', 'index.html');
		res.sendFile(indexPath);
	});

	server.listen(port, () => {
		console.log(`> Ready on http://${hostname}:${port}`);
	});

	return new Promise(() => {}); // Keep the process running
}

export default start;
