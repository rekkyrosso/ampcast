import {fromEvent, of, skipWhile, switchMap, takeUntil, tap} from 'rxjs';
import {NextVisualizer} from 'types/Visualizer';
import Player from 'types/Player';
import {Logger} from 'utils';
import audio from 'services/audio';
import {nextVisualizer, noVisualizer, observeNextVisualizer} from 'services/visualizer';
import {observeVisualizerProviders} from 'services/visualizer/visualizerProviders';
import OmniPlayer from './players/OmniPlayer';
import miniPlayer from './miniPlayer';

const logger = new Logger('visualizerPlayer');

const killed$ = fromEvent(window, 'pagehide');

function loadVisualizer(player: Player<NextVisualizer>, visualizer: NextVisualizer): void {
    player.load(visualizer);
}

const visualizerPlayer = new OmniPlayer<NextVisualizer>('visualizerPlayer', loadVisualizer);

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
        switchMap((active) => (active ? of(noVisualizer) : observeNextVisualizer())),
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
