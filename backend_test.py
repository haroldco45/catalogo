import requests
import sys
import json
from datetime import datetime

class LavaderoAPITester:
    def __init__(self, base_url="https://autowash-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'cliente_id': None,
            'vehiculo_id': None,
            'servicio_tipo_id': None,
            'servicio_id': None
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add authorization header if token exists and auth is required
        if self.token and auth_required:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_setup_admin(self):
        """Test creating initial admin user"""
        print("\n=== TESTING ADMIN SETUP ===")
        success, response = self.run_test(
            "Setup Admin User",
            "POST",
            "setup/admin",
            200,
            auth_required=False
        )
        
        if success:
            print("✅ Admin user setup completed")
            print(f"   Username: {response.get('username', 'admin')}")
            print(f"   Password: {response.get('password', 'admin123')}")
        
        return success

    def test_login(self):
        """Test login with admin credentials"""
        print("\n=== TESTING LOGIN ===")
        
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data,
            auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Login successful, token obtained")
            print(f"   User: {response.get('user', {}).get('full_name', 'Unknown')}")
            print(f"   Role: {response.get('user', {}).get('role', 'Unknown')}")
            return True
        
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n=== TESTING GET CURRENT USER ===")
        
        if not self.token:
            print("❌ Cannot test - no token available")
            return False
        
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"✅ Current user info retrieved")
            print(f"   Username: {response.get('username', 'Unknown')}")
            print(f"   Role: {response.get('role', 'Unknown')}")
        
        return success

    def test_business_config(self):
        """Test business configuration endpoints"""
        print("\n=== TESTING BUSINESS CONFIGURATION ===")
        
        if not self.token:
            print("❌ Cannot test - no token available")
            return False
        
        # Test getting current config
        success1, current_config = self.run_test(
            "Get Business Config",
            "GET",
            "business/config",
            200,
            auth_required=False  # This endpoint doesn't require auth
        )
        
        # Test updating business config
        new_config = {
            "business_name": "Lavadero Premium Test",
            "owner_name": "Juan Carlos Propietario",
            "phone": "(555) 987-6543",
            "email": "contacto@lavaderopremium.com",
            "address": "Avenida Principal 456, Ciudad Test",
            "currency": "USD",
            "timezone": "America/Mexico_City"
        }
        
        success2, updated_config = self.run_test(
            "Update Business Config",
            "POST",
            "business/config",
            200,
            data=new_config
        )
        
        if success2:
            print(f"✅ Business config updated")
            print(f"   Business Name: {updated_config.get('business_name', 'Unknown')}")
            print(f"   Owner: {updated_config.get('owner_name', 'Unknown')}")
        
        return success1 and success2

    def test_license_generation(self):
        """Test license generation"""
        print("\n=== TESTING LICENSE GENERATION ===")
        
        if not self.token:
            print("❌ Cannot test - no token available")
            return False
        
        # Generate license - business_name should be query parameter
        success, response = self.run_test(
            "Generate License",
            "POST",
            "business/license?business_name=Lavadero Premium Test",
            200
        )
        
        if success:
            license_key = response.get('license_key')
            print(f"✅ License generated successfully")
            print(f"   License Key: {license_key}")
            print(f"   Business: {response.get('business_name', 'Unknown')}")
            print(f"   Expiry: {response.get('expiry_date', 'Unknown')}")
            
            # Test license validation
            if license_key:
                success2, validation_response = self.run_test(
                    "Validate License",
                    "POST",
                    f"business/validate-license?license_key={license_key}",
                    200,
                    auth_required=False
                )
                
                if success2:
                    print(f"✅ License validation successful")
                    print(f"   Valid: {validation_response.get('valid', False)}")
                    print(f"   Features: {validation_response.get('features', [])}")
                
                return success and success2
        
        return success

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        print("\n=== TESTING UNAUTHORIZED ACCESS ===")
        
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        # Try to access protected endpoint without token
        success, response = self.run_test(
            "Access Dashboard Without Auth",
            "GET",
            "dashboard/estadisticas",
            403  # Should return 403 Forbidden (FastAPI returns 403 for missing auth)
        )
        
        # Restore token
        self.token = original_token
        
        if success:
            print("✅ Protected endpoint correctly requires authentication")
        
        return success

    def test_admin_only_access(self):
        """Test that admin-only endpoints work correctly"""
        print("\n=== TESTING ADMIN-ONLY ACCESS ===")
        
        if not self.token:
            print("❌ Cannot test - no token available")
            return False
        
        # Test business config update (admin only)
        test_config = {
            "business_name": "Admin Test Lavadero",
            "owner_name": "Admin Test Owner"
        }
        
        success, response = self.run_test(
            "Admin-Only Business Config Update",
            "POST",
            "business/config",
            200,
            data=test_config
        )
        
        if success:
            print("✅ Admin-only endpoint accessible with admin token")
        
        return success

    def test_initialize_data(self):
        """Initialize basic service types"""
        print("\n=== INITIALIZING DATA ===")
        success, response = self.run_test(
            "Initialize Data",
            "POST",
            "inicializar-datos",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n=== TESTING DASHBOARD ===")
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            "dashboard/estadisticas",
            200
        )
        return success

    def test_service_types(self):
        """Test service types endpoints"""
        print("\n=== TESTING SERVICE TYPES ===")
        
        # Get service types (should have 5 initialized)
        success, response = self.run_test(
            "Get Service Types",
            "GET",
            "tipos-servicios",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} service types")
            if len(response) >= 5:
                print("✅ Service types properly initialized")
                # Store first service type ID for later use
                if response:
                    self.created_ids['servicio_tipo_id'] = response[0]['servicio_tipo_id']
            else:
                print("⚠️  Expected at least 5 service types")
        
        return success

    def test_clients_crud(self):
        """Test clients CRUD operations"""
        print("\n=== TESTING CLIENTS CRUD ===")
        
        # Create client
        client_data = {
            "nombre": "Juan Pérez",
            "telefono": "555-1234",
            "email": "juan@example.com",
            "direccion": "Calle Principal 123"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clientes",
            200,
            data=client_data
        )
        
        if success and 'cliente_id' in response:
            self.created_ids['cliente_id'] = response['cliente_id']
            print(f"   Created client with ID: {self.created_ids['cliente_id']}")
            
            # Get client by ID
            success2, _ = self.run_test(
                "Get Client by ID",
                "GET",
                f"clientes/{self.created_ids['cliente_id']}",
                200
            )
            
            # Get all clients
            success3, _ = self.run_test(
                "Get All Clients",
                "GET",
                "clientes",
                200
            )
            
            return success and success2 and success3
        
        return False

    def test_vehicles_crud(self):
        """Test vehicles CRUD operations"""
        print("\n=== TESTING VEHICLES CRUD ===")
        
        if not self.created_ids['cliente_id']:
            print("❌ Cannot test vehicles - no client ID available")
            return False
        
        # Create vehicle
        vehicle_data = {
            "placa": "ABC123",
            "tipo": "Auto",
            "marca": "Toyota",
            "modelo": "Corolla",
            "color": "Blanco",
            "ano": 2020,
            "cliente_id": self.created_ids['cliente_id']
        }
        
        success, response = self.run_test(
            "Create Vehicle",
            "POST",
            "vehiculos",
            200,
            data=vehicle_data
        )
        
        if success and 'vehiculo_id' in response:
            self.created_ids['vehiculo_id'] = response['vehiculo_id']
            print(f"   Created vehicle with ID: {self.created_ids['vehiculo_id']}")
            
            # Get vehicle by ID
            success2, _ = self.run_test(
                "Get Vehicle by ID",
                "GET",
                f"vehiculos/{self.created_ids['vehiculo_id']}",
                200
            )
            
            # Get all vehicles
            success3, _ = self.run_test(
                "Get All Vehicles",
                "GET",
                "vehiculos",
                200
            )
            
            # Get vehicles by client
            success4, _ = self.run_test(
                "Get Client Vehicles",
                "GET",
                f"clientes/{self.created_ids['cliente_id']}/vehiculos",
                200
            )
            
            return success and success2 and success3 and success4
        
        return False

    def test_services_crud(self):
        """Test services CRUD operations"""
        print("\n=== TESTING SERVICES CRUD ===")
        
        if not self.created_ids['vehiculo_id'] or not self.created_ids['servicio_tipo_id']:
            print("❌ Cannot test services - missing vehicle or service type ID")
            return False
        
        # Create service
        service_data = {
            "vehiculo_id": self.created_ids['vehiculo_id'],
            "servicio_tipo_id": self.created_ids['servicio_tipo_id'],
            "costo": 25.0,
            "notas": "Lavado básico de prueba",
            "estado": "Completado"
        }
        
        success, response = self.run_test(
            "Create Service",
            "POST",
            "servicios",
            200,
            data=service_data
        )
        
        if success and 'servicio_id' in response:
            self.created_ids['servicio_id'] = response['servicio_id']
            print(f"   Created service with ID: {self.created_ids['servicio_id']}")
            
            # Get service by ID
            success2, _ = self.run_test(
                "Get Service by ID",
                "GET",
                f"servicios/{self.created_ids['servicio_id']}",
                200
            )
            
            # Get all services
            success3, _ = self.run_test(
                "Get All Services",
                "GET",
                "servicios",
                200
            )
            
            # Get services by vehicle
            success4, _ = self.run_test(
                "Get Vehicle Services",
                "GET",
                f"vehiculos/{self.created_ids['vehiculo_id']}/servicios",
                200
            )
            
            return success and success2 and success3 and success4
        
        return False

    def test_search_functionality(self):
        """Test search by license plate"""
        print("\n=== TESTING SEARCH FUNCTIONALITY ===")
        
        success, response = self.run_test(
            "Search by License Plate",
            "GET",
            "buscar",
            200,
            params={"placa": "ABC123"}
        )
        
        if success:
            if response.get('vehiculo') and response.get('cliente'):
                print("✅ Search returned vehicle and client data")
            else:
                print("⚠️  Search returned empty results")
        
        return success

    def test_reports(self):
        """Test reports functionality"""
        print("\n=== TESTING REPORTS ===")
        
        success, response = self.run_test(
            "Income Reports",
            "GET",
            "reportes/ingresos",
            200,
            params={"dias": 30}
        )
        
        return success

    def test_updated_dashboard(self):
        """Test dashboard after creating data"""
        print("\n=== TESTING UPDATED DASHBOARD ===")
        
        success, response = self.run_test(
            "Updated Dashboard Statistics",
            "GET",
            "dashboard/estadisticas",
            200
        )
        
        if success:
            print(f"   Clients: {response.get('clientes_total', 0)}")
            print(f"   Vehicles: {response.get('vehiculos_total', 0)}")
            print(f"   Services Today: {response.get('servicios_hoy', 0)}")
            print(f"   Services Month: {response.get('servicios_mes', 0)}")
        
        return success

def main():
    print("🚗 TESTING LAVADERO AUTHENTICATION & BUSINESS CONFIG SYSTEM")
    print("=" * 60)
    
    tester = LavaderoAPITester()
    
    # Run authentication and business config tests first
    auth_tests = [
        tester.test_setup_admin,
        tester.test_login,
        tester.test_get_current_user,
        tester.test_business_config,
        tester.test_license_generation,
        tester.test_unauthorized_access,
        tester.test_admin_only_access
    ]
    
    print("\n🔐 RUNNING AUTHENTICATION & BUSINESS CONFIG TESTS")
    print("=" * 60)
    
    for test in auth_tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Run basic functionality tests if authentication works
    if tester.token:
        print("\n🚗 RUNNING BASIC FUNCTIONALITY TESTS")
        print("=" * 60)
        
        basic_tests = [
            tester.test_initialize_data,
            tester.test_dashboard_stats,
            tester.test_service_types,
            tester.test_clients_crud,
            tester.test_vehicles_crud,
            tester.test_services_crud,
            tester.test_search_functionality,
            tester.test_reports,
            tester.test_updated_dashboard
        ]
        
        for test in basic_tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
    else:
        print("\n⚠️  SKIPPING BASIC FUNCTIONALITY TESTS - Authentication failed")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())