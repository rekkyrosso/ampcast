import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, skip} from 'rxjs/operators';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import OmniAnalyser from './OmniAnalyser';

console.log('module::audio');

export const audioContext = new AudioContext();
export const analyser = new AnalyserNode(audioContext, {
    fftSize: 2048,
    smoothingTimeConstant: 0,
});
export const simpleAnalyser = new OmniAnalyser(analyser, spotifyAudioAnalyser);

analyser.connect(audioContext.destination);

let html5AudioSourceNode: MediaElementAudioSourceNode;
let appleAudioSourceNode: MediaElementAudioSourceNode;

const audioSourceNode$ = new BehaviorSubject<AudioNode>(
    audioContext.createMediaElementSource(new Audio())
);

export function observeAudioSourceNode(): Observable<AudioNode> {
    return audioSourceNode$.pipe(distinctUntilChanged());
}

observePlaybackStart().subscribe(({currentItem}) => {
    if (currentItem!.src.startsWith('apple:')) {
        if (!appleAudioSourceNode) {
            const audioElement = document.querySelector(
                'audio#apple-music-player'
            ) as HTMLAudioElement;
            if (audioElement) {
                appleAudioSourceNode = audioContext.createMediaElementSource(audioElement);
            }
        }
        if (appleAudioSourceNode) {
            audioSourceNode$.next(appleAudioSourceNode);
        }
    } else {
        if (!html5AudioSourceNode) {
            const audioElement = document.querySelector('audio.html5-audio') as HTMLAudioElement;
            if (audioElement) {
                html5AudioSourceNode = audioContext.createMediaElementSource(audioElement);
            }
        }
        if (html5AudioSourceNode) {
            audioSourceNode$.next(html5AudioSourceNode);
        }
    }
});

observeAudioSourceNode()
    .pipe(skip(1)) // TODO: Do we need to disconnect?
    .subscribe((audioSourceNode) => audioSourceNode.connect(analyser));

export default {
    audioContext,
    analyser,
    simpleAnalyser,
    observeAudioSourceNode,
};
