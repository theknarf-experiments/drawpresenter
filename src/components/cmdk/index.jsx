import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { cmdk } from './cmdk.css.ts';

const CommandMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
	const containerElement = useRef(null)

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && e.metaKey) {
        setOpen((open) => !open);
      }
    }

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [])

	const onKeyDown = (e) => {
		//console.log(e.key, e);
	}

  return (
		<>
			<div className={cmdk} ref={containerElement} />
			<Command.Dialog
				open={open}
				onOpenChange={setOpen}
				onKeyDown={onKeyDown}
				label="Global Command Menu"
				container={containerElement.current}>
				<Command.Input />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					{children}
				</Command.List>
			</Command.Dialog>
		</>
  );
};

export default CommandMenu;
