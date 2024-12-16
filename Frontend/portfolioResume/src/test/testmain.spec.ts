describe('HelloWorldTest', () => {
  let consoleSpy: jasmine.Spy;

  beforeEach(() => {
    // Spy on the console.log method
    consoleSpy = spyOn(console, 'log');
  });

  it('should print Hello World to the console', () => {
    // Call the console.log method
    console.log('Hello World');

    // Assert that console.log was called with 'Hello World'
    expect(consoleSpy).toHaveBeenCalledWith('Hello World');
  });
});
