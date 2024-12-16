import { TestBed } from '@angular/core/testing';

describe('HelloWorldTest', () => {
  beforeEach(() => {

    TestBed.configureTestingModule({});
  });

  it('should print Hello World to the console', () => {
    const consoleSpy = spyOn(console, 'log'); 

    // Action: 
    console.log('Hello World');

    expect(consoleSpy).toHaveBeenCalledWith('Hello World');
  });
});