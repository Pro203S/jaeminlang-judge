export const AVAILABLE_TIERS: Tier[] = [
    {
        "category": "bronze",
        "stage": 5
    },
    {
        "category": "bronze",
        "stage": 4
    },
    {
        "category": "bronze",
        "stage": 3
    },
    {
        "category": "bronze",
        "stage": 2
    },
    {
        "category": "bronze",
        "stage": 1
    },
    
    {
        "category": "silver",
        "stage": 5
    },
    {
        "category": "silver",
        "stage": 4
    },
    {
        "category": "silver",
        "stage": 3
    },
    {
        "category": "silver",
        "stage": 2
    },
    {
        "category": "silver",
        "stage": 1
    },

    {
        "category": "gold",
        "stage": 5
    },
    {
        "category": "gold",
        "stage": 4
    },
    {
        "category": "gold",
        "stage": 3
    },
    {
        "category": "gold",
        "stage": 2
    },
    {
        "category": "gold",
        "stage": 1
    },

    {
        "category": "platinum",
        "stage": 5
    },
    {
        "category": "platinum",
        "stage": 4
    },
    {
        "category": "platinum",
        "stage": 3
    },
    {
        "category": "platinum",
        "stage": 2
    },
    {
        "category": "platinum",
        "stage": 1
    },

    {
        "category": "diamond",
        "stage": 5
    },
    {
        "category": "diamond",
        "stage": 4
    },
    {
        "category": "diamond",
        "stage": 3
    },
    {
        "category": "diamond",
        "stage": 2
    },
    {
        "category": "diamond",
        "stage": 1
    },

    {
        "category": "god",
        "stage": 5
    },
    {
        "category": "god",
        "stage": 4
    },
    {
        "category": "god",
        "stage": 3
    },
    {
        "category": "god",
        "stage": 2
    },
    {
        "category": "god",
        "stage": 1
    }
]

export function TierToScore(tier: Tier): number {
    let score = 0;

    switch (tier.category) {
        case "bronze":
            score += 1;
            break;
        case "silver":
            score += 2;
            break;
        case "gold":
            score += 3;
            break;
        case "platinum":
            score += 4;
            break;
        case "diamond":
            score += 5;
            break;
        case "god":
            score += 6;
            break;
    }

    // 5 -> 1, 1 -> 5로 만들기
    score *= (6 - tier.stage);

    return score;
}

export function TierToString(tier: Tier): string {
    let str = '';

    switch (tier.category) {
        case "bronze":
            str = "브론즈";
            break;
        case "silver":
            str = "실버";
            break;
        case "gold":
            str = "골드";
            break;
        case "platinum":
            str = "플레티넘";
            break;
        case "diamond":
            str = "다이아몬드";
            break;
        case "god":
            str = "God";
            break;
    }

    str += " ";

    switch (tier.stage) {
        case 5:
            str += "V";
            break;
        case 4:
            str += "IV";
            break;
        case 3:
            str += "III";
            break;
        case 2:
            str += "II";
            break;
        case 1:
            str += "I";
            break;
    }

    return str;
}