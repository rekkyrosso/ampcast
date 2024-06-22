import {tap, withLatestFrom} from 'rxjs';
import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import audio from 'services/audio';
import OmniPlayer from 'services/players/OmniPlayer';
import {Logger} from 'utils';
import {
    getVisualizerProvider,
    observeVisualizerProviders,
} from 'services/visualizer/visualizerProviders';
import {nextVisualizer, observeCurrentVisualizer} from 'services/visualizer';

const logger = new Logger('visualizerPlayer');

function selectPlayer(visualizer: Visualizer): Player<Visualizer> | null {
    return getVisualizerProvider(visualizer.providerId)?.player || null;
}

function loadVisualizer(player: Player<Visualizer>, visualizer: Visualizer): void {
    player.load(visualizer);
}

const visualizerPlayer = new OmniPlayer<Visualizer>(
    'visualizerPlayer',
    selectPlayer,
    loadVisualizer
);

visualizerPlayer.loop = true;
visualizerPlayer.muted = true;
visualizerPlayer.volume = 0.07;

visualizerPlayer
    .observeError()
    .pipe(
        tap(logger.error),
        tap(() => nextVisualizer('error'))
    )
    .subscribe(logger);

observeVisualizerProviders()
    .pipe(
        withLatestFrom(audio.observeReady()),
        tap(([providers, audio]) =>
            visualizerPlayer.registerPlayers(
                providers.map((provider) => provider.createPlayer(audio))
            )
        )
    )
    .subscribe(logger);

observeCurrentVisualizer()
    .pipe(tap((visualizer) => visualizerPlayer.load(visualizer)))
    .subscribe(logger);

export default visualizerPlayer;
