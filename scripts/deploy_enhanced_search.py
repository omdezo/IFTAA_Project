#!/usr/bin/env python3
"""
Enhanced Search Deployment Script
=================================

This script automates the deployment of the enhanced IFTAA search system
with Quran and Fatwa search capabilities.

Usage:
    python deploy_enhanced_search.py [options]

Options:
    --environment {dev|prod}  Deployment environment (default: dev)
    --skip-quran             Skip Quran data seeding
    --skip-build            Skip building Docker containers
    --reset-data            Reset all data (delete existing collections)
    --test                  Run tests after deployment
    --verbose               Enable verbose logging
"""

import argparse
import os
import sys
import subprocess
import time
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('deployment.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DeploymentError(Exception):
    """Custom exception for deployment errors"""
    pass

class EnhancedSearchDeployer:
    """Main deployment orchestrator for the enhanced search system"""
    
    def __init__(self, environment: str = "dev", verbose: bool = False):
        self.environment = environment
        self.verbose = verbose
        self.project_root = Path(__file__).parent.absolute()
        
        if verbose:
            logging.getLogger().setLevel(logging.DEBUG)
        
        logger.info(f"Initializing deployment for environment: {environment}")
        logger.info(f"Project root: {self.project_root}")
    
    def run_command(self, command: List[str], cwd: Optional[Path] = None, 
                   capture_output: bool = False, check: bool = True) -> subprocess.CompletedProcess:
        """Run a command with proper error handling"""
        cwd = cwd or self.project_root
        logger.debug(f"Running command: {' '.join(command)} in {cwd}")
        
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=capture_output,
                text=True,
                check=check
            )
            
            if capture_output and self.verbose:
                if result.stdout:
                    logger.debug(f"STDOUT: {result.stdout}")
                if result.stderr:
                    logger.debug(f"STDERR: {result.stderr}")
            
            return result
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed: {' '.join(command)}")
            logger.error(f"Exit code: {e.returncode}")
            if e.stdout:
                logger.error(f"STDOUT: {e.stdout}")
            if e.stderr:
                logger.error(f"STDERR: {e.stderr}")
            raise DeploymentError(f"Command failed: {' '.join(command)}")
    
    def check_prerequisites(self) -> None:
        """Check if all required tools are installed"""
        logger.info("Checking prerequisites...")
        
        required_commands = [
            ("python", "--version"),
            ("docker", "--version"),
            ("docker-compose", "--version"),
            ("dotnet", "--version")
        ]
        
        for cmd, version_flag in required_commands:
            try:
                result = self.run_command([cmd, version_flag], capture_output=True)
                logger.debug(f"{cmd}: {result.stdout.strip()}")
            except DeploymentError:
                raise DeploymentError(f"Required command not found: {cmd}")
        
        logger.info("✓ All prerequisites satisfied")
    
    def setup_environment(self) -> None:
        """Setup environment configuration"""
        logger.info("Setting up environment configuration...")
        
        # Create .env file from template
        env_template = self.project_root / "config.env"
        env_file = self.project_root / ".env"
        
        if env_template.exists() and not env_file.exists():
            with open(env_template, 'r') as template:
                env_content = template.read()
            
            # Replace placeholders based on environment
            if self.environment == "prod":
                env_content = env_content.replace("DEBUG=true", "DEBUG=false")
                env_content = env_content.replace("localhost", "0.0.0.0")
            
            with open(env_file, 'w') as env:
                env.write(env_content)
            
            logger.info("✓ Environment file created")
        
        # Setup Python virtual environment if it doesn't exist
        venv_path = self.project_root / "venv"
        if not venv_path.exists():
            logger.info("Creating Python virtual environment...")
            self.run_command([sys.executable, "-m", "venv", "venv"])
            logger.info("✓ Virtual environment created")
    
    def install_python_dependencies(self) -> None:
        """Install Python dependencies"""
        logger.info("Installing Python dependencies...")
        
        # Determine Python executable
        if os.name == 'nt':  # Windows
            python_exe = self.project_root / "venv" / "Scripts" / "python.exe"
            pip_exe = self.project_root / "venv" / "Scripts" / "pip.exe"
        else:  # Unix-like
            python_exe = self.project_root / "venv" / "bin" / "python"
            pip_exe = self.project_root / "venv" / "bin" / "pip"
        
        # Upgrade pip
        self.run_command([str(pip_exe), "install", "--upgrade", "pip"])
        
        # Install requirements
        requirements_file = self.project_root / "requirements.txt"
        if requirements_file.exists():
            self.run_command([str(pip_exe), "install", "-r", str(requirements_file)])
        
        logger.info("✓ Python dependencies installed")
    
    def start_milvus(self) -> None:
        """Start Milvus database using Docker Compose"""
        logger.info("Starting Milvus database...")
        
        docker_compose_file = self.project_root / "docker-compose.yml"
        if not docker_compose_file.exists():
            raise DeploymentError("docker-compose.yml not found")
        
        # Start Milvus services
        self.run_command(["docker-compose", "up", "-d"])
        
        # Wait for Milvus to be ready
        logger.info("Waiting for Milvus to be ready...")
        for i in range(30):  # Wait up to 30 seconds
            try:
                # Try to connect to Milvus
                result = self.run_command([
                    "python", "-c", 
                    "from pymilvus import connections; connections.connect('default', host='127.0.0.1', port='19530'); print('Connected')"
                ], capture_output=True, check=False)
                
                if result.returncode == 0:
                    logger.info("✓ Milvus is ready")
                    return
            except:
                pass
            
            time.sleep(1)
        
        raise DeploymentError("Milvus failed to start within timeout")
    
    def seed_fatwa_data(self) -> None:
        """Seed Fatwa data if not already done"""
        logger.info("Checking Fatwa data...")
        
        # Check if fatwas.json exists
        fatwas_json = self.project_root / "fatwas.json"
        if not fatwas_json.exists():
            logger.info("Fatwas data not found, running seeding...")
            self.run_command(["python", "seed_milvus.py"])
        else:
            logger.info("✓ Fatwa data already exists")
    
    def seed_quran_data(self) -> None:
        """Seed Quran data"""
        logger.info("Seeding Quran data...")
        
        # Check if Quran data file exists
        quran_data = self.project_root / "quran_surahs.json"
        if not quran_data.exists():
            # Use sample data for development
            sample_data = self.project_root / "data" / "quran_sample.json"
            if sample_data.exists():
                logger.warning("Using sample Quran data for development")
                quran_data = sample_data
            else:
                logger.warning("No Quran data found, skipping Quran seeding")
                return
        
        # Set environment variable for data path
        os.environ["QURAN_DATA_PATH"] = str(quran_data)
        
        # Run seeding script
        self.run_command(["python", "seed_quran.py"])
        logger.info("✓ Quran data seeded")
    
    def start_python_api(self) -> None:
        """Start the Python search API"""
        logger.info("Starting Python search API...")
        
        # Start the API in the background
        if os.name == 'nt':  # Windows
            python_exe = self.project_root / "venv" / "Scripts" / "python.exe"
        else:  # Unix-like
            python_exe = self.project_root / "venv" / "bin" / "python"
        
        # Start the API (this should be run in background in production)
        if self.environment == "prod":
            self.run_command([str(python_exe), "start_app.py"])
        else:
            logger.info("Starting Python API in development mode...")
            # For development, we'll assume it's started manually
            logger.info("✓ Python API ready (start manually: python app.py)")
    
    def build_csharp_project(self) -> None:
        """Build the C# project"""
        logger.info("Building C# project...")
        
        csharp_project = self.project_root / "IFTAA_Project"
        if not csharp_project.exists():
            raise DeploymentError("C# project directory not found")
        
        # Restore packages
        self.run_command(["dotnet", "restore"], cwd=csharp_project)
        
        # Build project
        self.run_command(["dotnet", "build", "--configuration", "Release"], cwd=csharp_project)
        
        logger.info("✓ C# project built successfully")
    
    def run_tests(self) -> None:
        """Run the test suite"""
        logger.info("Running test suite...")
        
        # Run Python tests
        try:
            self.run_command(["python", "-m", "pytest", "tests/", "-v"])
            logger.info("✓ Python tests passed")
        except DeploymentError:
            logger.warning("Python tests failed or not found")
        
        # Run C# tests
        test_project = self.project_root / "tests" / "IFTAA_Project.Tests"
        if test_project.exists():
            try:
                self.run_command(["dotnet", "test"], cwd=test_project)
                logger.info("✓ C# tests passed")
            except DeploymentError:
                logger.warning("C# tests failed")
        
    def reset_data(self) -> None:
        """Reset all data (delete existing collections)"""
        logger.warning("Resetting all data...")
        
        reset_script = """
from pymilvus import connections, utility
connections.connect("default", host="127.0.0.1", port="19530")

collections = ["fatwas_ar", "fatwas_en", "quran_ar", "quran_en"]
for collection_name in collections:
    if utility.has_collection(collection_name):
        utility.drop_collection(collection_name)
        print(f"Dropped collection: {collection_name}")
    else:
        print(f"Collection not found: {collection_name}")
        
print("Data reset complete")
"""
        
        with open("reset_data.py", "w") as f:
            f.write(reset_script)
        
        try:
            self.run_command(["python", "reset_data.py"])
            logger.info("✓ Data reset complete")
        finally:
            os.remove("reset_data.py")
    
    def deploy(self, skip_quran: bool = False, skip_build: bool = False, 
               reset_data: bool = False, run_tests: bool = False) -> None:
        """Main deployment workflow"""
        try:
            logger.info(f"Starting Enhanced Search deployment (environment: {self.environment})")
            
            # Check prerequisites
            self.check_prerequisites()
            
            # Setup environment
            self.setup_environment()
            
            # Install Python dependencies
            self.install_python_dependencies()
            
            # Start Milvus
            self.start_milvus()
            
            # Reset data if requested
            if reset_data:
                self.reset_data()
            
            # Seed data
            self.seed_fatwa_data()
            
            if not skip_quran:
                self.seed_quran_data()
            
            # Start Python API
            self.start_python_api()
            
            # Build C# project
            if not skip_build:
                self.build_csharp_project()
            
            # Run tests if requested
            if run_tests:
                self.run_tests()
            
            logger.info("🎉 Enhanced Search deployment completed successfully!")
            logger.info("")
            logger.info("Next steps:")
            logger.info("1. Start Python API: python app.py")
            logger.info("2. Start C# API: cd IFTAA_Project && dotnet run")
            logger.info("3. Access Swagger UI: http://localhost:5000")
            logger.info("4. Test search: http://localhost:5000/api/v2/enhancedsearch/health")
            
        except DeploymentError as e:
            logger.error(f"Deployment failed: {e}")
            sys.exit(1)
        except KeyboardInterrupt:
            logger.info("Deployment interrupted by user")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Unexpected error during deployment: {e}", exc_info=True)
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="Deploy Enhanced IFTAA Search System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--environment",
        choices=["dev", "prod"],
        default="dev",
        help="Deployment environment (default: dev)"
    )
    
    parser.add_argument(
        "--skip-quran",
        action="store_true",
        help="Skip Quran data seeding"
    )
    
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip building Docker containers"
    )
    
    parser.add_argument(
        "--reset-data",
        action="store_true",
        help="Reset all data (delete existing collections)"
    )
    
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run tests after deployment"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    deployer = EnhancedSearchDeployer(
        environment=args.environment,
        verbose=args.verbose
    )
    
    deployer.deploy(
        skip_quran=args.skip_quran,
        skip_build=args.skip_build,
        reset_data=args.reset_data,
        run_tests=args.test
    )

if __name__ == "__main__":
    main() 