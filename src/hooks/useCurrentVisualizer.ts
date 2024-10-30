import Visualizer from 'types/Visualizer';
import {getCurrentVisualizer, observeCurrentVisualizer} from 'services/visualizer';
import useObservable from './useObservable';

export default function useCurrentVisualizer(): Visualizer | null {
    return useObservable(observeCurrentVisualizer, getCurrentVisualizer());
}
