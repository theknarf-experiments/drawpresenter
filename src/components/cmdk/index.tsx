import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import styles from './cmdk.module.css';

const CommandMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
	const containerElement = useRef(null)

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && e.metaKey) {
				e.preventDefault()
        setOpen((open) => !open);
      }
    }

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [])

	const onKeyDown = (e) => {
		if(e.keyCode === 13 /* enter */) {
			setOpen(false);
		}
		//console.log(e.key, e);
	}

  return (
		<>
			<div className={styles.cmdk} ref={containerElement} />
			{/* @ts-ignore */}
			<Command.Dialog
				open={open}
				onOpenChange={setOpen}
				onKeyDown={onKeyDown}
				label="Global Command Menu"
				container={containerElement.current}>
				{/* @ts-ignore */}
				<Command.Input />
				{/* @ts-ignore */}
				<Command.List>
					{/* @ts-ignore */}
					<Command.Empty>No results found.</Command.Empty>
					{children}
				</Command.List>
			</Command.Dialog>
		</>
  );
};

export default CommandMenu;
