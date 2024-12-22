import 'zone.js/testing';

describe('simple math test', () => {
    it('should add 1 + 1 to the console', () => {
        const consoleSpy = spyOn(console, 'log');
        console.log(1 + 1);
        expect(consoleSpy).toHaveBeenCalledWith(2);
    });
});