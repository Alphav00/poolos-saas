/**
 * Port of frontend/tests/crossDimValidation.test.js, case for case.
 */
import { describe, expect, it } from 'vitest';
import { classifyCrossDim, entryWarning } from '../src';

describe('classifyCrossDim', () => {
  it('1: empty / zero / negative distance', () => {
    let r = classifyCrossDim(0, 30, 16);
    expect(r.role).toBe('-');
    expect(r.status).toBe('none');
    r = classifyCrossDim(null, 30, 16);
    expect(r.role).toBe('-');
    r = classifyCrossDim(-5, 30, 16);
    expect(r.role).toBe('-');
  });

  it('2a: dist = length -> Length, green', () => {
    const r = classifyCrossDim(30, 30, 16);
    expect(r.role).toBe('Length');
    expect(r.status).toBe('green');
  });

  it('2b: 1ft off on 30ft -> Length, yellow', () => {
    const r = classifyCrossDim(31, 30, 16);
    expect(r.role).toBe('Length');
    expect(r.status).toBe('yellow');
  });

  it('2c: 3ft off on 30ft -> Length, red, "off 3ft"', () => {
    const r = classifyCrossDim(33, 30, 16);
    expect(r.role).toBe('Length');
    expect(r.status).toBe('red');
    expect(r.message.includes('off') && r.message.includes('3')).toBe(true);
  });

  it('2d: dist=40 -> Diagonal (10% threshold)', () => {
    expect(classifyCrossDim(40, 30, 16).role).toBe('Diagonal');
  });

  it('3a: dist = width -> Width, green', () => {
    const r = classifyCrossDim(16, 30, 16);
    expect(r.role).toBe('Width');
    expect(r.status).toBe('green');
  });

  it('3b: 1ft off on 16ft -> Width, yellow', () => {
    const r = classifyCrossDim(17, 30, 16);
    expect(r.role).toBe('Width');
    expect(r.status).toBe('yellow');
  });

  it('4: tied L/W -> Width', () => {
    expect(classifyCrossDim(20, 20, 20).role).toBe('Width');
  });

  it('5: no reconstruction -> Diagonal, info', () => {
    const r = classifyCrossDim(30, 0, 0);
    expect(r.role).toBe('Diagonal');
    expect(r.status).toBe('info');
  });

  it('6: 25ft on 30x16 -> Diagonal, info', () => {
    const r = classifyCrossDim(25, 30, 16);
    expect(r.role).toBe('Diagonal');
    expect(r.status).toBe('info');
  });

  it('8a: small pool uses 2ft yellow floor', () => {
    expect(classifyCrossDim(11, 10, 5).status).toBe('yellow');
  });

  it('8b: 0.4ft off within 0.5ft green floor -> green', () => {
    expect(classifyCrossDim(10.4, 10, 5).status).toBe('green');
  });

  it('8c: 3ft off on a 10ft pool is out of role -> Diagonal', () => {
    expect(classifyCrossDim(13, 10, 5).role).toBe('Diagonal');
  });

  it('9a: 0.8% off on 50ft -> green', () => {
    expect(classifyCrossDim(50.4, 50, 25).status).toBe('green');
  });

  it('9b: 4% off on 50ft -> yellow', () => {
    expect(classifyCrossDim(52, 50, 25).status).toBe('yellow');
  });

  it('9c: 10% off on 50ft -> red', () => {
    expect(classifyCrossDim(55, 50, 25).status).toBe('red');
  });
});

describe('entryWarning', () => {
  it('7a-7h: structural validation', () => {
    expect(entryWarning({ from_point: 1, to_point: 2 }, 5)).toBe(null);
    expect(entryWarning({ from_point: 1, to_point: 1 }, 5)).toBe('from and to must differ');
    expect(entryWarning({ from_point: 0, to_point: 2 }, 5)).toBe('point 0 doesn\'t exist (1–5)');
    expect(entryWarning({ from_point: 1, to_point: 6 }, 5)).toBe('point 6 doesn\'t exist (1–5)');
    expect(entryWarning({ from_point: 1, to_point: 2 }, 0)).toBe('capture the perimeter first');
    expect(entryWarning({ from_point: null, to_point: 2 }, 5)).toBe('select both points');
    expect(entryWarning({}, 5)).toBe('select both points');
    expect(entryWarning({ from_point: 'a', to_point: 2 }, 5)).toBe('point a doesn\'t exist (1–5)');
  });
});
