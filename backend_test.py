import requests
import sys
from datetime import datetime, date
import json

class RetailStoreAPITester:
    def __init__(self, base_url="https://data-copy.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_category_id = None
        self.created_expense_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
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

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        self.run_test("Root endpoint", "GET", "", 200)
        self.run_test("Health check", "GET", "health", 200)

    def test_category_management(self):
        """Test expense category CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CATEGORY MANAGEMENT")
        print("="*50)
        
        # Initialize default categories
        self.run_test("Initialize default categories", "POST", "init-categories", 200)
        
        # Get categories
        success, categories = self.run_test("Get categories", "GET", "expense-categories", 200)
        if success and categories:
            print(f"   Found {len(categories)} categories")
        
        # Create new category
        new_category_data = {
            "name": "Test Category",
            "description": "Category for testing",
            "color": "#FF5733"
        }
        success, category = self.run_test("Create category", "POST", "expense-categories", 200, new_category_data)
        if success and category:
            self.created_category_id = category.get('id')
            print(f"   Created category ID: {self.created_category_id}")
        
        # Update category
        if self.created_category_id:
            update_data = {
                "name": "Updated Test Category",
                "description": "Updated description",
                "color": "#33FF57"
            }
            self.run_test("Update category", "PUT", f"expense-categories/{self.created_category_id}", 200, update_data)

    def test_daily_sales(self):
        """Test daily sales management"""
        print("\n" + "="*50)
        print("TESTING DAILY SALES")
        print("="*50)
        
        today = date.today().isoformat()
        
        # Create/update daily sale
        sale_data = {
            "date": today,
            "total_sales": 150000,
            "notes": "Test sale for today"
        }
        self.run_test("Create daily sale", "POST", "daily-sales", 200, sale_data)
        
        # Get specific daily sale
        self.run_test("Get daily sale", "GET", f"daily-sales/{today}", 200)
        
        # Get all daily sales
        self.run_test("Get all daily sales", "GET", "daily-sales", 200)

    def test_expenses(self):
        """Test expense management"""
        print("\n" + "="*50)
        print("TESTING EXPENSES")
        print("="*50)
        
        if not self.created_category_id:
            print("⚠️  No category ID available, skipping expense tests")
            return
        
        today = date.today().isoformat()
        
        # Create expense
        expense_data = {
            "date": today,
            "category_id": self.created_category_id,
            "description": "Test expense",
            "amount": 25000
        }
        success, expense = self.run_test("Create expense", "POST", "expenses", 200, expense_data)
        if success and expense:
            self.created_expense_id = expense.get('id')
            print(f"   Created expense ID: {self.created_expense_id}")
        
        # Get expenses for today
        self.run_test("Get today's expenses", "GET", "expenses", 200, params={"date_str": today})
        
        # Get all expenses
        self.run_test("Get all expenses", "GET", "expenses", 200)

    def test_reports(self):
        """Test reporting endpoints"""
        print("\n" + "="*50)
        print("TESTING REPORTS")
        print("="*50)
        
        today = date.today().isoformat()
        current_year = date.today().year
        current_month = date.today().month
        
        # Daily report
        self.run_test("Get daily report", "GET", f"reports/daily/{today}", 200)
        
        # Monthly report
        self.run_test("Get monthly report", "GET", f"reports/monthly/{current_year}/{current_month}", 200)

    def test_cleanup(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANUP TEST DATA")
        print("="*50)
        
        # Delete test expense
        if self.created_expense_id:
            self.run_test("Delete test expense", "DELETE", f"expenses/{self.created_expense_id}", 200)
        
        # Delete test category
        if self.created_category_id:
            self.run_test("Delete test category", "DELETE", f"expense-categories/{self.created_category_id}", 200)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Retail Store API Tests")
        print(f"📍 Base URL: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_category_management()
            self.test_daily_sales()
            self.test_expenses()
            self.test_reports()
            self.test_cleanup()
            
        except KeyboardInterrupt:
            print("\n⚠️  Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error: {str(e)}")
        
        # Print final results
        print("\n" + "="*50)
        print("FINAL RESULTS")
        print("="*50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = RetailStoreAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())