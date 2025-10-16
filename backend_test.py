import requests
import sys
import json
from datetime import datetime, timedelta

class DentalClinicAPITester:
    def __init__(self, base_url="https://denta-citas.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_patient_id = None
        self.created_appointment_id = None
        self.created_dentist_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
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
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register_admin(self):
        """Test admin registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        admin_data = {
            "email": f"admin_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Admin Test {timestamp}",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Admin registered with ID: {self.user_id}")
            return True
        return False

    def test_register_dentist(self):
        """Test dentist registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        dentist_data = {
            "email": f"dentist_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Dr. Test {timestamp}",
            "role": "dentista"
        }
        
        success, response = self.run_test(
            "Dentist Registration",
            "POST",
            "auth/register",
            200,
            data=dentist_data
        )
        
        if success and 'user' in response:
            self.created_dentist_id = response['user']['id']
            print(f"   Dentist registered with ID: {self.created_dentist_id}")
            return True
        return False

    def test_login(self):
        """Test login with admin credentials"""
        # First register a user to login with
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "email": f"login_test_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Login Test {timestamp}",
            "role": "admin"
        }
        
        # Register first
        reg_success, reg_response = self.run_test(
            "Registration for Login Test",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not reg_success:
            return False
            
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Logged in with token: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_patient(self):
        """Test patient creation"""
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            "name": f"Paciente Test {timestamp}",
            "phone": f"300123{timestamp}",
            "email": f"paciente_{timestamp}@test.com",
            "birth_date": "1990-01-01",
            "address": "Calle Test 123",
            "emergency_contact": "301456789",
            "notes": "Paciente de prueba"
        }
        
        success, response = self.run_test(
            "Create Patient",
            "POST",
            "patients",
            200,
            data=patient_data
        )
        
        if success and 'id' in response:
            self.created_patient_id = response['id']
            print(f"   Patient created with ID: {self.created_patient_id}")
            return True
        return False

    def test_get_patients(self):
        """Test get all patients"""
        success, response = self.run_test(
            "Get All Patients",
            "GET",
            "patients",
            200
        )
        
        if success:
            print(f"   Found {len(response)} patients")
        return success

    def test_get_patient_by_id(self):
        """Test get patient by ID"""
        if not self.created_patient_id:
            print("❌ No patient ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Patient by ID",
            "GET",
            f"patients/{self.created_patient_id}",
            200
        )
        return success

    def test_update_patient(self):
        """Test patient update"""
        if not self.created_patient_id:
            print("❌ No patient ID available for testing")
            return False
            
        update_data = {
            "notes": "Paciente actualizado en prueba"
        }
        
        success, response = self.run_test(
            "Update Patient",
            "PUT",
            f"patients/{self.created_patient_id}",
            200,
            data=update_data
        )
        return success

    def test_get_dentists(self):
        """Test get all dentists"""
        success, response = self.run_test(
            "Get All Dentists",
            "GET",
            "dentists",
            200
        )
        
        if success:
            print(f"   Found {len(response)} dentists")
        return success

    def test_create_appointment(self):
        """Test appointment creation"""
        if not self.created_patient_id or not self.created_dentist_id:
            print("❌ Missing patient or dentist ID for appointment test")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        appointment_data = {
            "patient_id": self.created_patient_id,
            "dentist_id": self.created_dentist_id,
            "date": tomorrow,
            "time": "10:00",
            "duration": 60,
            "reason": "Limpieza dental de prueba",
            "notes": "Cita de prueba"
        }
        
        success, response = self.run_test(
            "Create Appointment",
            "POST",
            "appointments",
            200,
            data=appointment_data
        )
        
        if success and 'id' in response:
            self.created_appointment_id = response['id']
            print(f"   Appointment created with ID: {self.created_appointment_id}")
            return True
        return False

    def test_get_appointments(self):
        """Test get all appointments"""
        success, response = self.run_test(
            "Get All Appointments",
            "GET",
            "appointments",
            200
        )
        
        if success:
            print(f"   Found {len(response)} appointments")
        return success

    def test_get_appointments_by_date(self):
        """Test get appointments by date"""
        today = datetime.now().strftime("%Y-%m-%d")
        success, response = self.run_test(
            "Get Appointments by Date",
            "GET",
            "appointments",
            200,
            params={"date": today}
        )
        
        if success:
            print(f"   Found {len(response)} appointments for today")
        return success

    def test_update_appointment(self):
        """Test appointment update"""
        if not self.created_appointment_id:
            print("❌ No appointment ID available for testing")
            return False
            
        update_data = {
            "status": "completada",
            "notes": "Cita completada en prueba"
        }
        
        success, response = self.run_test(
            "Update Appointment",
            "PUT",
            f"appointments/{self.created_appointment_id}",
            200,
            data=update_data
        )
        return success

    def test_create_medical_history(self):
        """Test medical history creation"""
        if not self.created_patient_id:
            print("❌ No patient ID available for medical history test")
            return False
            
        history_data = {
            "patient_id": self.created_patient_id,
            "treatment": "Limpieza dental profunda",
            "diagnosis": "Gingivitis leve",
            "notes": "Tratamiento exitoso",
            "cost": 150000.0
        }
        
        success, response = self.run_test(
            "Create Medical History",
            "POST",
            "medical-history",
            200,
            data=history_data
        )
        return success

    def test_get_patient_medical_history(self):
        """Test get patient medical history"""
        if not self.created_patient_id:
            print("❌ No patient ID available for medical history test")
            return False
            
        success, response = self.run_test(
            "Get Patient Medical History",
            "GET",
            f"medical-history/patient/{self.created_patient_id}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} medical records")
        return success

    def test_get_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats",
            200
        )
        
        if success:
            print(f"   Stats: {response}")
        return success

    def test_delete_appointment(self):
        """Test appointment deletion"""
        if not self.created_appointment_id:
            print("❌ No appointment ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Appointment",
            "DELETE",
            f"appointments/{self.created_appointment_id}",
            200
        )
        return success

    def test_delete_patient(self):
        """Test patient deletion (admin only)"""
        if not self.created_patient_id:
            print("❌ No patient ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Patient",
            "DELETE",
            f"patients/{self.created_patient_id}",
            200
        )
        return success

def main():
    print("🏥 Starting Dental Clinic API Tests...")
    print("=" * 50)
    
    tester = DentalClinicAPITester()
    
    # Authentication tests
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    if not tester.test_register_admin():
        print("❌ Admin registration failed, stopping tests")
        return 1
    
    if not tester.test_register_dentist():
        print("❌ Dentist registration failed")
    
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1
    
    tester.test_get_me()
    
    # Patient management tests
    print("\n👥 PATIENT MANAGEMENT TESTS")
    print("-" * 30)
    tester.test_create_patient()
    tester.test_get_patients()
    tester.test_get_patient_by_id()
    tester.test_update_patient()
    
    # Dentist tests
    print("\n🦷 DENTIST TESTS")
    print("-" * 30)
    tester.test_get_dentists()
    
    # Appointment tests
    print("\n📅 APPOINTMENT TESTS")
    print("-" * 30)
    tester.test_create_appointment()
    tester.test_get_appointments()
    tester.test_get_appointments_by_date()
    tester.test_update_appointment()
    
    # Medical history tests
    print("\n📋 MEDICAL HISTORY TESTS")
    print("-" * 30)
    tester.test_create_medical_history()
    tester.test_get_patient_medical_history()
    
    # Dashboard tests
    print("\n📊 DASHBOARD TESTS")
    print("-" * 30)
    tester.test_get_stats()
    
    # Cleanup tests
    print("\n🗑️ CLEANUP TESTS")
    print("-" * 30)
    tester.test_delete_appointment()
    tester.test_delete_patient()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("✅ Backend API tests mostly successful!")
        return 0
    else:
        print("❌ Backend API tests failed - multiple issues found")
        return 1

if __name__ == "__main__":
    sys.exit(main())