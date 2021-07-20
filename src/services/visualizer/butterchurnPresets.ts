import butterchurnPresets from 'butterchurn-presets';

export interface ButterchurnPreset {
    readonly name: string;
    readonly data: MilkdropRawData;
}

const presets: ButterchurnPreset[] = Object.keys(butterchurnPresets).map((name) => {
    return {name, data: butterchurnPresets[name]};
});

export default presets;
