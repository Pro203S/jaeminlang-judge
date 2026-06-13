// do u finding AVAILABLE_TIERS? it's in tier.ts

export const AVAILABLE_TAGS = [
    {
        "label": "입출력",
        "value": "inout"
    },
    {
        "label": "연산",
        "value": "operate"
    },
    {
        "label": "판단",
        "value": "judgment"
    },
    {
        "label": "문자열",
        "value": "string"
    },
    {
        "label": "배열",
        "value": "array"
    },
    {
        "label": "구현",
        "value": "implement"
    }
];

export const TAG_TO_STRING = (tag: string): string => {
    const found = AVAILABLE_TAGS.map(v => v.value).findIndex(v => v === tag);
    if (found === -1) throw new Error("Tag " + tag + " not found");

    return AVAILABLE_TAGS[found].label;
}

export const ADMIN_ID = "ca51bc59-4f53-44b6-bd11-143cbd2115e5";