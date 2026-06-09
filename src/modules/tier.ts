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
