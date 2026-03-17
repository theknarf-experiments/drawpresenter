import path from 'path';
import { watch } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import { openDocument, addSlideAfter, updateFrontmatter, patchDocument, applyPatchToDoc, serialize, Document, Section } from './document';
import { Operation } from 'fast-json-patch';

interface HistoryEntry {
	operations: Operation[];
	source: 'user' | 'file';
}

interface EditHistory {
	baseDoc: Document;
	entries: HistoryEntry[];
	pointer: number; // index of the last applied entry (-1 = at base)
}

const start = async (projectFile: string, dev: boolean = false, hostname: string = 'localhost', port: number = 3000): Promise<void> => {
	const server = express();

	const projectPath = path.dirname(path.resolve(projectFile));
	console.log(projectPath);
	server.use('/files', express.static(projectPath));

	server.use(express.json({ limit: '50mb' }));

	let history: EditHistory | null = null;

	const getCurrentDoc = (): Document => {
		if (!history) throw new Error('No document loaded');
		let doc = history.baseDoc;
		for (let i = 0; i <= history.pointer; i++) {
			doc = applyPatchToDoc(doc, history.entries[i].operations);
		}
		return doc;
	};

	const initHistory = async (): Promise<Document> => {
		const doc = await openDocument(projectFile);
		if (history) {
			// Preserve IDs for sections whose content matches
			const usedIds = new Set<string>();
			doc.sections = doc.sections.map(s => {
				const currentDoc = getCurrentDoc();
				const match = currentDoc.sections.find(
					p => p.source === s.source && !usedIds.has(p.id)
				);
				if (match) {
					usedIds.add(match.id);
					return { ...s, id: match.id };
				}
				return s;
			});
		}
		history = { baseDoc: doc, entries: [], pointer: -1 };
		return doc;
	};

	const applyAndRecord = async (operations: Operation[], source: 'user' | 'file' = 'user'): Promise<Document> => {
		if (!history) await initHistory();

		// Truncate any redo history
		history!.entries = history!.entries.slice(0, history!.pointer + 1);
		history!.entries.push({ operations, source });
		history!.pointer++;

		const doc = getCurrentDoc();
		await saveDoc(doc);
		return doc;
	};

	let lastWrittenHash = '';

	const hashContent = (content: string) =>
		createHash('md5').update(content).digest('hex');

	const saveDoc = async (doc: Document) => {
		const content = serialize(doc);
		lastWrittenHash = hashContent(content);
		await writeFile(path.resolve(projectFile), content, 'utf-8');
	};

	// Presentation state
	let presentationSlide = 0;

	// SSE: track connected clients
	const sseClients = new Set<Response>();

	const getDocWithHistory = (doc: Document) => ({
		...doc,
		presentationSlide,
		history: history ? {
			pointer: history.pointer,
			totalEntries: history.entries.length,
			entries: history.entries.map((entry, i) => ({
				index: i,
				active: i <= history!.pointer,
				source: entry.source,
				operations: entry.operations,
			})),
		} : { pointer: -1, totalEntries: 0, entries: [] },
	});

	const notifyClients = (doc: Document) => {
		const data = JSON.stringify(getDocWithHistory(doc));
		for (const client of sseClients) {
			client.write(`data: ${data}\n\n`);
		}
	};

	// Watch the project file for external changes
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	watch(path.resolve(projectFile), () => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			// Check if the file content actually changed from what we last wrote
			const content = await readFile(path.resolve(projectFile), 'utf-8');
			if (hashContent(content) === lastWrittenHash) return;

			console.log('File changed externally, recording in history');

			const newDoc = await openDocument(projectFile);

			if (!history) {
				history = { baseDoc: newDoc, patches: [], pointer: -1 };
				notifyClients(newDoc);
				return;
			}

			// Preserve IDs for sections whose content matches
			const currentDoc = getCurrentDoc();
			const usedIds = new Set<string>();
			newDoc.sections = newDoc.sections.map(s => {
				const match = currentDoc.sections.find(
					p => p.source === s.source && !usedIds.has(p.id)
				);
				if (match) {
					usedIds.add(match.id);
					return { ...s, id: match.id };
				}
				return s;
			});

			// Record as a replace operation in history
			const operations: Operation[] = [
				{ op: 'replace', path: '/frontmatter', value: newDoc.frontmatter },
				{ op: 'replace', path: '/sections', value: newDoc.sections },
			];

			// Truncate redo history
			history.entries = history.entries.slice(0, history.pointer + 1);
			history.entries.push({ operations, source: 'file' });
			history.pointer++;

			notifyClients(getCurrentDoc());
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
		const doc = history ? getCurrentDoc() : await initHistory();
		res.json({ doc: getDocWithHistory(doc) });
	});

	server.post('/doc/upload-image', async (req: Request, res: Response) => {
		const { data, filename } = req.body; // data is base64, filename includes extension
		const buffer = Buffer.from(data, 'base64');
		const filePath = path.join(projectPath, filename);
		await writeFile(filePath, buffer);
		res.json({ filename });
	});

	server.post('/doc/slide', async (req: Request, res: Response) => {
		const { slide } = req.body;
		presentationSlide = slide;
		const doc = history ? getCurrentDoc() : await initHistory();
		// Notify without saving to file — this is ephemeral state
		notifyClients(doc);
		res.json({ ok: true });
	});

	server.post('/doc/add-slide', async (req: Request, res: Response) => {
		const { afterIndex } = req.body;
		const operations: Operation[] = [
			{ op: 'add', path: `/sections/${afterIndex + 1}`, value: { source: '\n# New slide\n\n' } },
		];
		const doc = await applyAndRecord(operations);

		res.json({ doc: getDocWithHistory(doc) });
		notifyClients(doc);
	});

	server.post('/doc/frontmatter', async (req: Request, res: Response) => {
		const { frontmatter } = req.body;
		const operations: Operation[] = [
			{ op: 'replace', path: '/frontmatter', value: frontmatter },
		];
		const doc = await applyAndRecord(operations);

		res.json({ doc: getDocWithHistory(doc) });
		notifyClients(doc);
	});

	server.patch('/doc', async (req: Request, res: Response) => {
		const operations: Operation[] = req.body;
		const doc = await applyAndRecord(operations);

		res.json({ doc: getDocWithHistory(doc) });
		notifyClients(doc);
	});

	server.post('/doc/undo', async (req: Request, res: Response) => {
		if (!history || history.pointer < 0) {
			const doc = history ? getCurrentDoc() : await initHistory();
			res.json({ doc: getDocWithHistory(doc) });
			return;
		}
		history.pointer--;
		const doc = getCurrentDoc();
		await saveDoc(doc);

		res.json({ doc: getDocWithHistory(doc) });
		notifyClients(doc);
	});

	server.post('/doc/redo', async (req: Request, res: Response) => {
		if (!history || history.pointer >= history.entries.length - 1) {
			const doc = history ? getCurrentDoc() : await initHistory();
			res.json({ doc: getDocWithHistory(doc) });
			return;
		}
		history.pointer++;
		const doc = getCurrentDoc();
		await saveDoc(doc);

		res.json({ doc: getDocWithHistory(doc) });
		notifyClients(doc);
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
