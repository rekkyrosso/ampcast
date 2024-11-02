import Visualizer from './Visualizer';

type VisualizerFavorite = Pick<Visualizer, 'providerId' | 'name' | 'title' | 'spotifyExcluded'>;

export default VisualizerFavorite;
