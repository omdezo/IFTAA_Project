#!/usr/bin/env python3
"""
Docker Testing Script for IFTAA Project
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def run_command(cmd, timeout=30):
    """Run a command and return result"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def test_docker_installed():
    """Test if Docker is installed"""
    print("Testing Docker installation...")
    
    success, stdout, stderr = run_command("docker --version")
    if not success:
        print(f"FAIL: Docker not installed - {stderr}")
        return False
    
    print(f"PASS: Docker found - {stdout.strip()}")
    
    success, stdout, stderr = run_command("docker-compose --version")
    if not success:
        print(f"FAIL: Docker Compose not installed - {stderr}")
        return False
    
    print(f"PASS: Docker Compose found - {stdout.strip()}")
    return True

def test_docker_compose_config():
    """Test Docker Compose configuration"""
    print("Testing Docker Compose configuration...")
    
    # Change to deployment directory
    root_dir = Path(__file__).parent.parent
    os.chdir(root_dir / "deployment")
    
    success, stdout, stderr = run_command("docker-compose config")
    if not success:
        print(f"FAIL: Docker Compose config invalid - {stderr}")
        return False
    
    print("PASS: Docker Compose configuration is valid")
    return True

def test_docker_build():
    """Test Docker build process"""
    print("Testing Docker build process...")
    
    # Change to deployment directory
    root_dir = Path(__file__).parent.parent
    os.chdir(root_dir / "deployment")
    
    # Build images
    success, stdout, stderr = run_command("docker-compose build --no-cache", timeout=300)
    if not success:
        print(f"FAIL: Docker build failed - {stderr}")
        return False
    
    print("PASS: Docker images built successfully")
    return True

def test_docker_services():
    """Test Docker services startup"""
    print("Testing Docker services startup...")
    
    # Change to deployment directory
    root_dir = Path(__file__).parent.parent
    os.chdir(root_dir / "deployment")
    
    # Start services
    print("Starting services...")
    success, stdout, stderr = run_command("docker-compose up -d", timeout=120)
    if not success:
        print(f"FAIL: Failed to start services - {stderr}")
        return False
    
    # Wait for services to initialize
    print("Waiting for services to initialize...")
    time.sleep(30)
    
    # Check service status
    success, stdout, stderr = run_command("docker-compose ps")
    if not success:
        print(f"FAIL: Failed to check service status - {stderr}")
        return False
    
    print("Service status:")
    print(stdout)
    
    # Check if all services are running
    if "Up" not in stdout:
        print("FAIL: Some services are not running")
        return False
    
    print("PASS: All services are running")
    return True

def test_api_health():
    """Test API health endpoints"""
    print("Testing API health endpoints...")
    
    # Test .NET API
    success, stdout, stderr = run_command('curl -f http://localhost:8080/health')
    if success:
        print("PASS: .NET API health check")
    else:
        print("FAIL: .NET API health check failed")
        return False
    
    # Test Python AI service
    success, stdout, stderr = run_command('curl -f http://localhost:5001/health')
    if success:
        print("PASS: Python AI service health check")
    else:
        print("FAIL: Python AI service health check failed")
        return False
    
    return True

def cleanup_docker():
    """Clean up Docker resources"""
    print("Cleaning up Docker resources...")
    
    # Change to deployment directory
    root_dir = Path(__file__).parent.parent
    os.chdir(root_dir / "deployment")
    
    # Stop and remove containers
    run_command("docker-compose down -v", timeout=60)
    
    # Remove images
    run_command("docker-compose down --rmi all", timeout=60)
    
    print("Docker cleanup completed")

def main():
    """Run all Docker tests"""
    print("IFTAA Docker Testing Suite")
    print("=" * 40)
    
    tests = [
        ("Docker Installation", test_docker_installed),
        ("Docker Compose Config", test_docker_compose_config),
        ("Docker Build", test_docker_build),
        ("Docker Services", test_docker_services),
        ("API Health", test_api_health)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        try:
            result = test_func()
            results.append((name, result))
            if not result:
                print(f"Stopping tests due to failure in {name}")
                break
        except Exception as e:
            print(f"ERROR: {name} test failed: {e}")
            results.append((name, False))
            break
    
    print("\n" + "=" * 40)
    print("Test Results:")
    print("=" * 40)
    
    passed = 0
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    # Cleanup
    if "--cleanup" in sys.argv:
        cleanup_docker()
    
    if passed == len(results):
        print("SUCCESS: All Docker tests passed!")
        return True
    else:
        print("WARNING: Some Docker tests failed.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)