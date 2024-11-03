import {fromEvent, of, skipWhile, switchMap, takeUntil, tap} from 'rxjs';
import NextVisualizerReason from 'types/NextVisualizerReason';
import Player from 'types/Player';
import Visualizer, {VisualizerWithReason} from 'types/Visualizer';
import audio from 'services/audio';
import {observeVisualizerProviders} from 'services/visualizer/visualizerProviders';
import {
    nextVisualizer,
    noVisualizer,
    observeCurrentVisualizer,
    observeNextVisualizerReason,
} from 'services/visualizer';
import {Logger} from 'utils';
import OmniPlayer from './players/OmniPlayer';
import miniPlayer from './miniPlayer';

const logger = new Logger('visualizerPlayer');

const killed$ = fromEvent(window, 'pagehide');

let nextVisualizerReason: NextVisualizerReason;

function loadVisualizer(player: Player<VisualizerWithReason>, visualizer: Visualizer): void {
    player.load({...visualizer, reason: nextVisualizerReason});
}

const visualizerPlayer = new OmniPlayer<VisualizerWithReason, Visualizer>(
    'visualizerPlayer',
    loadVisualizer
);

visualizerPlayer.loop = true;
visualizerPlayer.muted = true;
visualizerPlayer.volume = 0.07;

observeNextVisualizerReason().subscribe((reason) => (nextVisualizerReason = reason));

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
