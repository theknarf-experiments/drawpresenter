#!/usr/bin/env node
import { program } from 'commander';
import start from './server';

const dev = process.env.NODE_ENV !== 'production';

program
	.name('drawpresenter')
	.description('DrawPresenter CLI')
	.version('0.0.0');

program
	.command('start')
	.argument('<file>', 'Markdown file uses for the presentation')
   .description('Start the application')
   .action(async (file: string, options: any) => {
		return start(file, dev);
	});

program.parse();

if (!process.argv.slice(2).length) {
	program.outputHelp();
}


