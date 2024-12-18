import unittest

def run_all_tests():
    """
    Discover and run all test cases in the current directory.
    """
    # Discover tests in the current directory
    test_loader = unittest.TestLoader()
    test_suite = test_loader.discover(start_dir='.', pattern='test_*.py')

    # Run the tests
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_runner.run(test_suite)

if __name__ == "__main__":
    run_all_tests()
