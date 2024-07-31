import YouTubeFactory from 'youtube-player';
import YouTubePlayer from './YouTubePlayer';

export default class YouTubePlaylistLoader {
    private static id = 0;
    private player: YT.Player | null = null;
    private readonly element: HTMLElement;
    private readonly targetId: string;

    constructor() {
        const element = (this.element = document.createElement('div'));
        const target = document.createElement('div');
        this.targetId = `youtube-iframe-loader-${YouTubePlaylistLoader.id++}`;
        element.hidden = true;
        target.id = this.targetId;
        element.append(target);
        document.body.appendChild(element);
    }

    async load(list: string): Promise<readonly string[]> {
        return new Promise((resolve, reject) => {
            const timerId = setTimeout(() => reject('timeout'), 3000);

            const {playerVars, host} = YouTubePlayer;

            const Player = YouTubeFactory(this.targetId, {playerVars, host} as any);

            Player.on('ready', ({target: player}: any) => {
                this.player = player;
                player.mute();
                player.cuePlaylist({list, listType: 'playlist'});
            });

            Player.on('stateChange', ({data: state}) => {
                if (state === YT.PlayerState.CUED) {
                    clearTimeout(timerId);
                    resolve(this.player!.getPlaylist());
                }
            });

            Player.on('error', (error) => {
                clearTimeout(timerId);
                reject(error);
            });
        });
    }

    destroy(): void {
        this.player?.destroy();
        this.element.remove();
    }
}

export async function loadYouTubePlaylist(playlistId: string): Promise<readonly string[]> {
    const loader = new YouTubePlaylistLoader();
    try {
        const playlist = await loader.load(playlistId);
        return playlist;
    } finally {
        loader.destroy();
    }
}
