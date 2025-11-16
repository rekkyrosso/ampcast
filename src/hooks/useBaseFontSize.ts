import theme from 'services/theme';
import useObservable from './useObservable';

export default function useBaseFontSize(): number {
    return useObservable(theme.observeFontSize, theme.fontSize);
}
