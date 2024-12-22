import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

describe('Hello World Test', () => {
  it('should log "Hello World" to the console', () => {
    const consoleSpy = spyOn(console, 'log');
    console.log('Hello World');
    expect(consoleSpy).toHaveBeenCalledWith('Hello Wold');
  });
});

describe('Math Test', () => {
  it('should double the number', () => {
    const double = (num: number) => num * 2;
    const result = double(4);
    expect(result).toBe(8);
  });
});
