import {LiteStorage} from 'utils';

export const authSettings = new LiteStorage('spotify/auth');
export const userSettings = new LiteStorage('spotify/user', 'memory');
