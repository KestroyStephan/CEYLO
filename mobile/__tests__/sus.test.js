import { susScore } from '../utils/sus';

describe('System Usability Scale scoring', () => {
  test('best possible answers score 100', () => {
    expect(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
  });
  test('worst possible answers score 0', () => {
    expect(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
  });
  test('all neutral answers score 50', () => {
    expect(susScore(Array(10).fill(3))).toBe(50);
  });
  test('a typical response', () => {
    // odd items: 4,4,5,4,4 -> 3+3+4+3+3 = 16; even items: 2,1,2,2,1 -> 3+4+3+3+4 = 17; (16+17)*2.5
    expect(susScore([4, 2, 4, 1, 5, 2, 4, 2, 4, 1])).toBe(82.5);
  });
  test('rejects incomplete or out-of-range answers', () => {
    expect(() => susScore([5, 1, 5])).toThrow();
    expect(() => susScore([6, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toThrow();
  });
});
