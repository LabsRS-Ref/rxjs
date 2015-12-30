import {Operator} from '../Operator';
import {Observable} from '../Observable';
import {Subscriber} from '../Subscriber';
import {tryCatch} from '../util/tryCatch';
import {errorObject} from '../util/errorObject';

/**
 * Returns an Observable that applies a specified accumulator function to each item emitted by the source Observable.
 * If a seed value is specified, then that value will be used as the initial value for the accumulator.
 * If no seed value is specified, the first item of the source is used as the seed.
 * @param {function} accumulator The accumulator function called on each item.
 * @param {any} [seed] The initial accumulator value.
 * @returns {Obervable} An observable of the accumulated values.
 */
export function scan<T, R>(accumulator: (acc: R, x: T) => R, seed?: T | R): Observable<R> {
  return this.lift(new ScanOperator(accumulator, seed));
}

class ScanOperator<T, R> implements Operator<T, R> {
  constructor(private accumulator: (acc: R, x: T) => R, private seed?: T | R) {
  }

  call(subscriber: Subscriber<T>): Subscriber<T> {
    return new ScanSubscriber(subscriber, this.accumulator, this.seed);
  }
}

class ScanSubscriber<T, R> extends Subscriber<T> {
  private _seed: T | R;

  get seed(): T | R {
    return this._seed;
  }

  set seed(value: T | R) {
    this.accumulatorSet = true;
    this._seed = value;
  }

  private accumulatorSet: boolean = false;

  constructor(destination: Subscriber<T>, private accumulator: (acc: R, x: T) => R, seed?: T|R) {
    super(destination);
    this.seed = seed;
    this.accumulator = accumulator;
    this.accumulatorSet = typeof seed !== 'undefined';
  }

  protected _next(value: T): void {
    if (!this.accumulatorSet) {
      this.seed = value;
      this.destination.next(value);
    } else {
      const result = tryCatch(this.accumulator).call(this, this.seed, value);
      if (result === errorObject) {
        this.destination.error(errorObject.e);
      } else {
        this.seed = result;
        this.destination.next(this.seed);
      }
    }
  }
}
