import path from 'path';
import { watch } from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import { openDocument, addSlideAfter, updateFrontmatter, patchDocument } from './document';

const start = async (projectFile: string, dev: boolean = false, hostname: string = 'localhost', port: number = 3000): Promise<void> => {
	const server = express();

	const projectPath = path.dirname(path.resolve(projectFile));
	console.log(projectPath);
	server.use('/files', express.static(projectPath));

	server.use(express.json());

	// SSE: track connected clients
	const sseClients = new Set<Response>();

	const notifyClients = () => {
		for (const client of sseClients) {
			client.write(`data: changed\n\n`);
		}
	};

	// Watch the project file for external changes
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	watch(path.resolve(projectFile), () => {
		// Debounce to avoid rapid duplicate events
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			console.log('File changed, notifying clients');
			notifyClients();
		}, 100);
	});

	server.get('/doc/events', (req: Request, res: Response) => {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		});
		res.write('\n');

		sseClients.add(res);
		req.on('close', () => {
			sseClients.delete(res);
		});
	});

	server.get('/doc', async (req: Request, res: Response) => {
		console.log(`/doc ${projectFile}`);
		const doc = await openDocument(projectFile);

		res.json({ doc });
	});

	server.post('/doc/add-slide', async (req: Request, res: Response) => {
		const { afterIndex } = req.body;
		const doc = await addSlideAfter(projectFile, afterIndex);

		res.json({ doc });
		notifyClients();
	});

	server.post('/doc/frontmatter', async (req: Request, res: Response) => {
		const { frontmatter } = req.body;
		const doc = await updateFrontmatter(projectFile, frontmatter);

		res.json({ doc });
		notifyClients();
	});

	server.patch('/doc', async (req: Request, res: Response) => {
		const operations = req.body;
		const doc = await patchDocument(projectFile, operations);

		res.json({ doc });
		notifyClients();
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
