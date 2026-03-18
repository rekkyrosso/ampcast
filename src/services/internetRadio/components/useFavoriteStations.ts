import useObservable from 'hooks/useObservable';
import stationStore from '../stationStore';

export default function useFavoriteStations() {
    return useObservable(stationStore.observeFavorites, stationStore.getFavorites());
}
