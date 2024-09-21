import {fromEvent, of, skipWhile, switchMap, takeUntil, tap} from 'rxjs';
import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import audio from 'services/audio';
import {observeVisualizerProviders} from 'services/visualizer/visualizerProviders';
import {nextVisualizer, noVisualizer, observeCurrentVisualizer} from 'services/visualizer';
import {Logger} from 'utils';
import OmniPlayer from './players/OmniPlayer';
import miniPlayer from './miniPlayer';

const logger = new Logger('visualizerPlayer');

const killed$ = fromEvent(window, 'pagehide');

function loadVisualizer(player: Player<Visualizer>, visualizer: Visualizer): void {
    player.load(visualizer);
}

const visualizerPlayer = new OmniPlayer<Visualizer>('visualizerPlayer', loadVisualizer);

visualizerPlayer.loop = true;
visualizerPlayer.muted = true;
visualizerPlayer.volume = 0.07;

observeVisualizerProviders()
    .pipe(
        skipWhile((providers) => providers.length === 0),
        tap((providers) =>
            visualizerPlayer.registerPlayers(
                providers.map((provider) => [
                    provider.createPlayer(audio),
                    (visualizer) => visualizer.providerId === provider.id,
                ])
            )
        ),
        switchMap(() => miniPlayer.observeActive()),
        switchMap((active) => (active ? of(noVisualizer) : observeCurrentVisualizer())),
        tap((visualizer) => visualizerPlayer.load(visualizer)),
        takeUntil(killed$)
    )
    .subscribe(logger);

visualizerPlayer
    .observeError()
    .pipe(
        tap(logger.error),
        tap(() => nextVisualizer('error')),
        takeUntil(killed$)
    )
    .subscribe(logger);

export default visualizerPlayer;
