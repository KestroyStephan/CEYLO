// __tests__/VendorRevenue.test.js

// This simulates the logic extracted from VendorRevenueScreen.js 
// for testing the Trust Score algorithm independently.

const calculateTrustScore = (completionRate, avgRating, tenureDays) => {
    // 40% Completion + 40% Rating + 20% Tenure
    let tenureScore = 0;
    if (tenureDays > 365) tenureScore = 1.0;
    else if (tenureDays > 180) tenureScore = 0.8;
    else if (tenureDays > 30) tenureScore = 0.5;
    else tenureScore = 0.2;

    const ratingScore = avgRating / 5.0;
    const finalScore = (completionRate * 0.4) + (ratingScore * 0.4) + (tenureScore * 0.2);
    
    return Math.min(Math.max(finalScore * 100, 0), 100);
};

describe('Vendor Trust Score Algorithm', () => {
    it('should calculate perfect score for top vendors', () => {
        const score = calculateTrustScore(1.0, 5.0, 400); // 100% completion, 5 stars, >1 year
        expect(score).toBeCloseTo(100);
    });

    it('should calculate average score for new vendors', () => {
        const score = calculateTrustScore(0.8, 4.0, 15); // 80% completion, 4 stars, 15 days (0.2 tenure)
        // (0.8 * 0.4) + (0.8 * 0.4) + (0.2 * 0.2) = 0.32 + 0.32 + 0.04 = 0.68 -> 68%
        expect(score).toBeCloseTo(68);
    });

    it('should penalize low completion rates', () => {
        const score = calculateTrustScore(0.5, 4.5, 200); // 50% completion, 4.5 stars, 200 days (0.8 tenure)
        // (0.5 * 0.4) + (0.9 * 0.4) + (0.8 * 0.2) = 0.20 + 0.36 + 0.16 = 0.72 -> 72%
        expect(score).toBeCloseTo(72);
    });
});
