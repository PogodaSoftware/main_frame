import 'zone.js/testing';


describe('Hello World Test', () => {
  it('should log "Hello World" to the console', () => {
    const consoleSpy = spyOn(console, 'log');
    console.log('Hello World');
    expect(consoleSpy).toHaveBeenCalledWith('Hello World');
  });
});
