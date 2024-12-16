import { jest } from '@jest/globals';

describe('HelloWorldTest', () => {
  beforeEach(() => {
  });

  it('should print Hello World to the console', () => {
    const consoleSpy = jest.spyOn(console, 'log'); 

    
    console.log('Hello World');

    
    expect(consoleSpy).toHaveBeenCalledWith('Hello World');

    consoleSpy.mockRestore();
  });
});
