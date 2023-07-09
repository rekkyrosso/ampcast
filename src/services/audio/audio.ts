import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, skip} from 'rxjs';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import OmniAudioContext from './OmniAudioContext';

export const audioContext = new OmniAudioContext();
export const analyserNode = audioContext.createAnalyser({
    fftSize: 2048,
    smoothingTimeConstant: 0,
});

analyserNode.connect(audioContext.destination);

let html5AudioSourceNode: MediaElementAudioSourceNode;
let appleAudioSourceNode: MediaElementAudioSourceNode;

const audioSourceNode$ = new BehaviorSubject<AudioNode>(
    audioContext.createMediaElementSource(new Audio())
);

export function observeAudioSourceNode(): Observable<AudioNode> {
    return audioSourceNode$.pipe(distinctUntilChanged());
}

observePlaybackStart().subscribe(({currentItem}) => {
    if (currentItem?.src.startsWith('apple:')) {
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
    .subscribe((audioSourceNode) => audioSourceNode.connect(analyserNode));
