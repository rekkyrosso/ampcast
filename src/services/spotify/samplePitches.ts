interface Note {
    readonly index: number;
    readonly value: number;
}

const notes: Note[] = [
    16.35, 17.32, 18.35, 19.45, 20.6, 21.83, 23.12, 24.5, 25.96, 27.5, 29.14, 30.87,
]
    .map((note, index) => {
        const range = [{index, value: note}];
        for (let i = 1; i < 12; i++) {
            range[i] = {index, value: note * 2 ** i};
        }
        return range;
    })
    .flat()
    .sort((a, b) => a.value - b.value);

export function samplePitches(
    pitches: readonly number[],
    sample: number,
    sampleSize: number
): number {
    return getNoteValues(sample, sampleSize)
        .map(({index, value}) => pitches[index] * value)
        .reduce((total, value) => total + value, 0);
}

function getNoteValues(sample: number, sampleSize: number): readonly Note[] {
    const min = sample * sampleSize;
    const max = min + sampleSize;
    const matches = notes.filter((note) => note.value >= min && note.value < max);
    if (matches.length > 0) {
        return matches.map(({index}) => ({index, value: 1}));
    }
    for (let i = 0; i < notes.length; i++) {
        const maxNote = notes[i];
        const maxNoteValue = maxNote.value;
        if (maxNoteValue > max) {
            const minNote = notes[i - 1];
            const minNoteValue = minNote?.value || 0;
            const distance = maxNoteValue - minNoteValue;
            const values = [{index: maxNote.index, value: 1 - (maxNoteValue - min) / distance}];
            if (minNote) {
                values.push({index: minNote.index, value: 1 - (max - minNoteValue) / distance});
            }
            return values;
        }
    }
    return [];
}
