import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting,
}
from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
);

describe('simple math test', () => {
    it('should add 1 + 1 to the console', () => {
        const consoleSpy = spyOn(console, 'log');
        console.log(1 + 1);
        expect(consoleSpy).toHaveBeenCalledWith(2);
    });
});