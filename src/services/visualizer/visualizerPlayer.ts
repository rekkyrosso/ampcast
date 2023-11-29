import {tap} from 'rxjs';
import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import audio from 'services/audio';
import OmniPlayer from 'services/players/OmniPlayer';
import {Logger} from 'utils';
import {getAllVisualizerProviders, getVisualizerPlayer} from './visualizerProviders';

const logger = new Logger('visualizerPlayer');

function selectPlayer(visualizer: Visualizer): Player<Visualizer> | null {
    return getVisualizerPlayer(visualizer.providerId) || null;
}

function loadVisualizer(player: Player<Visualizer>, visualizer: Visualizer): void {
    player.load(visualizer);
}

const visualizerPlayer = new OmniPlayer<Visualizer>(
    'visualizer-player',
    selectPlayer,
    loadVisualizer
);

visualizerPlayer.loop = true;
visualizerPlayer.muted = true;
visualizerPlayer.volume = 0.07;
visualizerPlayer.observeError().subscribe(logger.error);

audio
    .observeReady()
    .pipe(
        tap((audio) =>
            visualizerPlayer.registerPlayers(
                getAllVisualizerProviders().map((provider) => provider.createPlayer(audio))
            )
        )
    )
    .subscribe(logger);

export default visualizerPlayer;
