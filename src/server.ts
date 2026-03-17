import path from 'path';
import { watch } from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import { openDocument, addSlideAfter, updateFrontmatter, patchDocument, Document, Section } from './document';

const start = async (projectFile: string, dev: boolean = false, hostname: string = 'localhost', port: number = 3000): Promise<void> => {
	const server = express();

	const projectPath = path.dirname(path.resolve(projectFile));
	console.log(projectPath);
	server.use('/files', express.static(projectPath));

	server.use(express.json());

	// Keep cached doc for stable IDs across re-parses
	let cachedDoc: Document | null = null;

	const getDoc = async (): Promise<Document> => {
		const doc = await openDocument(projectFile);
		if (cachedDoc) {
			// Preserve IDs for sections whose content matches
			const usedIds = new Set<string>();
			doc.sections = doc.sections.map(s => {
				const match = cachedDoc!.sections.find(
					p => p.source === s.source && !usedIds.has(p.id)
				);
				if (match) {
					usedIds.add(match.id);
					return { ...s, id: match.id };
				}
				return s; // keeps the new UUID from parse
			});
		}
		cachedDoc = doc;
		return doc;
	};

	const updateCache = (doc: Document) => {
		cachedDoc = doc;
	};

	// SSE: track connected clients
	const sseClients = new Set<Response>();

	const notifyClients = (doc: Document) => {
		const data = JSON.stringify(doc);
		for (const client of sseClients) {
			client.write(`data: ${data}\n\n`);
		}
	};

	// Watch the project file for external changes
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressWatcher = false;

	const notifyAndSuppress = (doc: Document) => {
		suppressWatcher = true;
		notifyClients(doc);
		// Allow watcher again after debounce window
		setTimeout(() => { suppressWatcher = false; }, 200);
	};

	watch(path.resolve(projectFile), () => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			if (suppressWatcher) return;
			console.log('File changed externally, notifying clients');
			const doc = await getDoc();
			notifyClients(doc);
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
		const doc = await getDoc();
		res.json({ doc });
	});

	server.post('/doc/add-slide', async (req: Request, res: Response) => {
		const { afterIndex } = req.body;
		const existing = cachedDoc || await getDoc();
		const doc = await addSlideAfter(projectFile, afterIndex, existing);
		updateCache(doc);

		res.json({ doc });
		notifyAndSuppress(doc);
	});

	server.post('/doc/frontmatter', async (req: Request, res: Response) => {
		const { frontmatter } = req.body;
		const existing = cachedDoc || await getDoc();
		const doc = await updateFrontmatter(projectFile, frontmatter, existing);
		updateCache(doc);

		res.json({ doc });
		notifyAndSuppress(doc);
	});

	server.patch('/doc', async (req: Request, res: Response) => {
		const operations = req.body;
		const existing = cachedDoc || await getDoc();
		const doc = await patchDocument(projectFile, operations, existing);
		updateCache(doc);

		res.json({ doc });
		notifyAndSuppress(doc);
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
