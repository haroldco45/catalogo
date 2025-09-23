import requests
import sys
from datetime import datetime, date
import json

class PrestamosOportunosAPITester:
    def __init__(self, base_url="https://easy-loans-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_loan_ids = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request and return response"""
        url = f"{self.api_url}/{endpoint}"
        headers = self.headers.copy()
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            return success, response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return False, None

    def test_init_admin(self):
        """Test admin initialization"""
        print("\n🔧 Testing Admin Initialization...")
        success, response = self.make_request('POST', 'auth/init-admin', expected_status=200)
        
        if success:
            data = response.json()
            self.log_test("Init Admin", True, f"Admin user created: {data.get('username')}")
        else:
            # Admin might already exist, check if it's a 400 error
            if response and response.status_code == 400:
                self.log_test("Init Admin", True, "Admin already exists (expected)")
            else:
                self.log_test("Init Admin", False, f"Status: {response.status_code if response else 'No response'}")

    def test_login(self):
        """Test login functionality"""
        print("\n🔐 Testing Authentication...")
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success:
            data = response.json()
            self.token = data.get('access_token')
            user_info = data.get('user', {})
            self.log_test("Login", True, f"Token received, User: {user_info.get('username')}")
            return True
        else:
            self.log_test("Login", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_create_client(self):
        """Test client creation"""
        print("\n👤 Testing Client Management...")
        client_data = {
            "name": "María González",
            "cedula": "98765432",
            "cellphone": "3109876543"
        }
        
        success, response = self.make_request('POST', 'clients', client_data, 200)
        
        if success:
            data = response.json()
            self.created_client_id = data.get('id')
            self.log_test("Create Client", True, f"Client created: {data.get('name')} (ID: {self.created_client_id})")
            return True
        else:
            self.log_test("Create Client", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_clients(self):
        """Test getting all clients"""
        success, response = self.make_request('GET', 'clients', expected_status=200)
        
        if success:
            data = response.json()
            self.log_test("Get Clients", True, f"Retrieved {len(data)} clients")
            return True
        else:
            self.log_test("Get Clients", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_create_loans(self):
        """Test loan creation with different modalities"""
        print("\n💰 Testing Loan Management...")
        
        if not self.created_client_id:
            self.log_test("Create Loans", False, "No client ID available")
            return False

        # Loan 1: Modality 1 (6.7% every 8 days)
        loan1_data = {
            "client_id": self.created_client_id,
            "amount": 500000,
            "modality": 1,
            "start_date": date.today().isoformat()
        }
        
        success1, response1 = self.make_request('POST', 'loans', loan1_data, 200)
        
        if success1:
            data1 = response1.json()
            loan_id1 = data1.get('id')
            self.created_loan_ids.append(loan_id1)
            self.log_test("Create Loan (Modality 1)", True, f"Amount: ${loan1_data['amount']:,} COP")
        else:
            self.log_test("Create Loan (Modality 1)", False, f"Status: {response1.status_code if response1 else 'No response'}")

        # Loan 2: Modality 2 (10% monthly, pay every 15 days)
        loan2_data = {
            "client_id": self.created_client_id,
            "amount": 1000000,
            "modality": 2,
            "start_date": date.today().isoformat(),
            "duration_months": 6
        }
        
        success2, response2 = self.make_request('POST', 'loans', loan2_data, 200)
        
        if success2:
            data2 = response2.json()
            loan_id2 = data2.get('id')
            self.created_loan_ids.append(loan_id2)
            self.log_test("Create Loan (Modality 2)", True, f"Amount: ${loan2_data['amount']:,} COP, Duration: {loan2_data['duration_months']} months")
        else:
            self.log_test("Create Loan (Modality 2)", False, f"Status: {response2.status_code if response2 else 'No response'}")

        return success1 and success2

    def test_get_loans(self):
        """Test getting all loans"""
        success, response = self.make_request('GET', 'loans', expected_status=200)
        
        if success:
            data = response.json()
            self.log_test("Get Loans", True, f"Retrieved {len(data)} loans")
            return True
        else:
            self.log_test("Get Loans", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_create_payments(self):
        """Test payment creation"""
        print("\n💳 Testing Payment System...")
        
        if len(self.created_loan_ids) < 2:
            self.log_test("Create Payments", False, "Not enough loan IDs available")
            return False

        # Interest payment for first loan
        payment1_data = {
            "loan_id": self.created_loan_ids[0],
            "payment_date": date.today().isoformat(),
            "amount": 50000,
            "type": "interest"
        }
        
        success1, response1 = self.make_request('POST', 'payments', payment1_data, 200)
        
        if success1:
            self.log_test("Create Interest Payment", True, f"Amount: ${payment1_data['amount']:,} COP")
        else:
            self.log_test("Create Interest Payment", False, f"Status: {response1.status_code if response1 else 'No response'}")

        # Capital payment for second loan
        payment2_data = {
            "loan_id": self.created_loan_ids[1],
            "payment_date": date.today().isoformat(),
            "amount": 100000,
            "type": "capital"
        }
        
        success2, response2 = self.make_request('POST', 'payments', payment2_data, 200)
        
        if success2:
            self.log_test("Create Capital Payment", True, f"Amount: ${payment2_data['amount']:,} COP")
        else:
            self.log_test("Create Capital Payment", False, f"Status: {response2.status_code if response2 else 'No response'}")

        return success1 and success2

    def test_reports(self):
        """Test report endpoints"""
        print("\n📊 Testing Reports...")
        
        if not self.created_client_id:
            self.log_test("Client Debt Report", False, "No client ID available")
            return False

        # Client debt report
        success1, response1 = self.make_request('GET', f'reports/client-debt/{self.created_client_id}', expected_status=200)
        
        if success1:
            data1 = response1.json()
            self.log_test("Client Debt Report", True, f"Total due: ${data1.get('total_due', 0):,.2f} COP")
        else:
            self.log_test("Client Debt Report", False, f"Status: {response1.status_code if response1 else 'No response'}")

        # All debts report
        success2, response2 = self.make_request('GET', 'reports/all-debts', expected_status=200)
        
        if success2:
            data2 = response2.json()
            self.log_test("All Debts Report", True, f"Found {len(data2)} active debts")
        else:
            self.log_test("All Debts Report", False, f"Status: {response2.status_code if response2 else 'No response'}")

        return success1 and success2

    def test_dashboard(self):
        """Test dashboard summary"""
        print("\n📈 Testing Dashboard...")
        
        success, response = self.make_request('GET', 'dashboard/summary', expected_status=200)
        
        if success:
            data = response.json()
            self.log_test("Dashboard Summary", True, 
                         f"Clients: {data.get('total_clients')}, Loans: {data.get('total_loans')}, Portfolio: ${data.get('total_portfolio', 0):,.2f} COP")
            return True
        else:
            self.log_test("Dashboard Summary", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting PRESTAMOS OPORTUNOS API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Initialize admin (might already exist)
        self.test_init_admin()

        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Test client management
        self.test_create_client()
        self.test_get_clients()

        # Test loan management
        self.test_create_loans()
        self.test_get_loans()

        # Test payment system
        self.test_create_payments()

        # Test reports
        self.test_reports()

        # Test dashboard
        self.test_dashboard()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = PrestamosOportunosAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())