#!/usr/bin/env python3
"""
Docker Cleanup Script for IFTAA Project
Cleans up existing containers and networks
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, ignore_errors=False):
    """Run a command and return result"""
    try:
        print(f"Running: {cmd}")
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0 and not ignore_errors:
            print(f"Command failed: {result.stderr}")
            return False
        
        if result.stdout:
            print(result.stdout)
        
        return True
        
    except subprocess.TimeoutExpired:
        print("Command timed out")
        return False
    except Exception as e:
        print(f"Command error: {e}")
        return False

def cleanup_containers():
    """Clean up existing containers"""
    print("Cleaning up existing containers...")
    
    # Stop all containers for this project
    containers = [
        "iftaa-mongodb",
        "iftaa-mongo-express", 
        "milvus-etcd",
        "milvus-minio",
        "milvus-standalone",
        "iftaa-python-service",
        "iftaa-dotnet-api"
    ]
    
    for container in containers:
        print(f"Stopping and removing container: {container}")
        run_command(f"docker stop {container}", ignore_errors=True)
        run_command(f"docker rm {container}", ignore_errors=True)
    
    # Also try to stop any containers with deployment prefix
    run_command("docker stop $(docker ps -aq --filter name=deployment_)", ignore_errors=True)
    run_command("docker rm $(docker ps -aq --filter name=deployment_)", ignore_errors=True)

def cleanup_networks():
    """Clean up existing networks"""
    print("Cleaning up existing networks...")
    
    networks = [
        "iftaa-network",
        "deployment_iftaa-network",
        "deployment_default"
    ]
    
    for network in networks:
        print(f"Removing network: {network}")
        run_command(f"docker network rm {network}", ignore_errors=True)

def cleanup_volumes():
    """Clean up existing volumes"""
    print("Cleaning up existing volumes...")
    
    volumes = [
        "deployment_mongo_data",
        "deployment_milvus_data", 
        "deployment_etcd_data",
        "deployment_minio_data"
    ]
    
    for volume in volumes:
        print(f"Removing volume: {volume}")
        run_command(f"docker volume rm {volume}", ignore_errors=True)

def cleanup_images():
    """Clean up built images"""
    print("Cleaning up built images...")
    
    # Remove images built for this project
    run_command("docker rmi $(docker images -q --filter reference=deployment_*)", ignore_errors=True)
    run_command("docker rmi $(docker images -q --filter reference=deployment-*)", ignore_errors=True)

def full_cleanup():
    """Perform full Docker cleanup"""
    print("IFTAA Docker Cleanup")
    print("=" * 40)
    
    # Change to deployment directory
    root_dir = Path(__file__).parent.parent
    deployment_dir = root_dir / "deployment"
    
    if deployment_dir.exists():
        os.chdir(deployment_dir)
        print(f"Working directory: {deployment_dir}")
        
        # Try docker-compose down first
        print("Attempting docker-compose down...")
        run_command("docker-compose down -v --remove-orphans", ignore_errors=True)
    
    # Manual cleanup
    cleanup_containers()
    cleanup_networks() 
    cleanup_volumes()
    
    if "--images" in sys.argv:
        cleanup_images()
    
    # Clean up dangling resources
    print("Cleaning up dangling resources...")
    run_command("docker system prune -f", ignore_errors=True)
    
    print("\nCleanup completed!")
    print("You can now run: docker-compose up -d")

if __name__ == "__main__":
    full_cleanup()