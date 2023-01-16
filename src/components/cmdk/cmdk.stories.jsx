import React from 'react';
import CMDK from '.';
import { Command } from 'cmdk';

export default {
  title: 'CMDK',
  component: CMDK,
};

export const Primary = () => (
	<>
		<i>Hit cmd+k to test the component</i>
		<CMDK>
			<Command.Item>Start presentation</Command.Item>
			<Command.Item>Open for print</Command.Item>
		</CMDK>
	</>
);
