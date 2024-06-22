import {CoverArtVisualizer} from 'types/Visualizer';
import {default as DefaultVisualizer} from '../components/CoverArtVisualizer';

const defaultVisualizer: CoverArtVisualizer = {
    providerId: 'coverart',
    name: '',
    component: DefaultVisualizer,
};

const visualizers: CoverArtVisualizer[] = [defaultVisualizer];

export default visualizers;
