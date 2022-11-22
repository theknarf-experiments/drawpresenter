#!/usr/bin/env node
const { program } = require('commander');
const start = require('./server');

const dev = process.env.NODE_ENV !== 'production';

program
	.name('drawpresenter')
	.description('DrawPresenter CLI')
	.version('0.0.0');

program
	.command('start')
	.argument('<file>', 'Markdown file uses for the presentation')
  .description('Start the application')
  .action((directory, options) => {
		start(directory, dev);
	});

program.parse();

if (!process.argv.slice(2).length) {
	program.outputHelp();
}


