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

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

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
    print("🚗 TESTING LAVADERO API SYSTEM")
    print("=" * 50)
    
    tester = LavaderoAPITester()
    
    # Run all tests in sequence
    tests = [
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
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())