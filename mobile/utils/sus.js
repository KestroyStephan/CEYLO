/**
 * System Usability Scale scoring (Brooke, 1996).
 * Odd items score (answer - 1), even items (5 - answer); the sum times 2.5 gives 0-100.
 */
export function susScore(answers) {
  if (!Array.isArray(answers) || answers.length !== 10 || answers.some(a => !(a >= 1 && a <= 5))) {
    throw new Error('SUS needs ten answers from 1 to 5');
  }
  const sum = answers.reduce((s, a, i) => s + (i % 2 === 0 ? a - 1 : 5 - a), 0);
  return sum * 2.5;
}
