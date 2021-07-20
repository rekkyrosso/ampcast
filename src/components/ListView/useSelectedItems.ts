import {useCallback, useLayoutEffect, useState} from 'react';

export default function useSelectedItems<T>(items: readonly T[], itemKey: keyof T) {
    const [selectedItems, setSelectedItems] = useState<readonly T[]>([]);

    useLayoutEffect(() => {
        // Make sure that `selectedItems` is always a subset of `items`.
        const newSelectedItems = items.filter((item) =>
            selectedItems.some((selectedItem) => selectedItem[itemKey] === item[itemKey])
        );
        if (!compareArrays(selectedItems, newSelectedItems)) {
            setSelectedItems(newSelectedItems);
        }
    }, [items, selectedItems, itemKey]);

    const selectAll = useCallback(() => {
        setSelectedItems(items.slice());
    }, [items]);

    const selectAt = useCallback(
        (index: number) => {
            const item = items[index];
            setSelectedItems(item ? [item] : []);
        },
        [items]
    );

    const selectRange = useCallback(
        (firstIndex: number, lastIndex: number) => {
            const start = Math.min(firstIndex, lastIndex);
            const end = Math.max(firstIndex, lastIndex);
            const selectedItems = items.slice(start, end + 1);
            setSelectedItems(selectedItems);
        },
        [items]
    );

    const toggleSelectionAt = useCallback(
        (index: number, force?: boolean) => {
            const item = items[index];
            const hasItem = selectedItems.includes(item);
            if (hasItem !== force) {
                if (hasItem) {
                    setSelectedItems(selectedItems.filter((selected) => selected !== item));
                } else {
                    setSelectedItems(selectedItems.concat(item));
                }
            }
        },
        [items, selectedItems]
    );

    return {selectedItems, selectAll, selectAt, selectRange, toggleSelectionAt};
}

function compareArrays<T>(array1: readonly T[], array2: readonly T[]): boolean {
    if (array1.length !== array2.length) {
        return false;
    }
    return array1.every((value, index) => array2[index] === value);
}
