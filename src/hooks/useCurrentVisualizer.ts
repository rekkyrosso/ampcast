import Visualizer from 'types/Visualizer';
import {observeCurrentVisualizer} from 'services/visualizer';
import useObservable from './useObservable';

export default function useCurrentVisualizer(): Visualizer | null {
    return useObservable(observeCurrentVisualizer, null);
}
