import os
frontend_port = os.getenv('FRONTEND_PORT')
def selecting_different_routes(page, route):
    if route == 'kevin':
        page.goto(f"http://localhost:{frontend_port}/kevin")
    elif route == 'pogoda':
        
        page.goto(f"http://localhost:{frontend_port}/pogoda")
    else:
        raise ValueError(f"Unknown route: {route}")
