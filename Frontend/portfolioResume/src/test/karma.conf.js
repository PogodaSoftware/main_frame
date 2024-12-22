module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    files: [
      { pattern: './test-setup.ts', watched: false }, // Load test setup
      { pattern: './**/*.spec.ts', watched: false },  // Load all test files in the current directory
    ],
    preprocessors: {
      './test-setup.ts': ['webpack'],
      './**/*.spec.ts': ['webpack'],
    },
    client: {
      jasmine: {},
      clearContext: false, // Leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // Suppress duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    singleRun: false, // Use `true` for CI
    restartOnFileChange: true,
  });
};
