import requests
import sys
import json
import os
from datetime import datetime
from io import BytesIO
import tempfile

class LinkDirectoryAPITester:
    def __init__(self, base_url="https://linkhub-28.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_links = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        if details:
            print(f"   Details: {details}")

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'No message')}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def test_get_approved_links(self):
        """Test getting approved links"""
        try:
            response = requests.get(f"{self.api_url}/links?status=approved", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Links count: {len(data)}"
            self.log_test("Get Approved Links", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Get Approved Links", False, str(e))
            return False, []

    def test_get_all_links(self):
        """Test getting all links (admin endpoint)"""
        try:
            response = requests.get(f"{self.api_url}/links/all", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Total links: {len(data)}"
            self.log_test("Get All Links (Admin)", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Get All Links (Admin)", False, str(e))
            return False, []

    def test_get_stats(self):
        """Test getting statistics"""
        try:
            response = requests.get(f"{self.api_url}/links/stats", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Total submissions: {data.get('total_submissions', 0)}, Revenue: ${data.get('estimated_revenue', 0)}"
            self.log_test("Get Statistics", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Get Statistics", False, str(e))
            return False, {}

    def create_test_image(self):
        """Create a simple test image for payment screenshot"""
        try:
            # Create a simple 100x100 pixel image data (minimal PNG)
            png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00d\x00\x00\x00d\x08\x02\x00\x00\x00\xff\x80\x02\x03\x00\x00\x00\x19tEXtSoftware\x00Adobe ImageReadyq\xc9e<\x00\x00\x00\x0eIDATx\xdac\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
            return BytesIO(png_data)
        except:
            # Fallback: create a text file as image
            return BytesIO(b"fake image data for testing")

    def test_submit_link_valid(self):
        """Test submitting a valid link"""
        try:
            # Create test data
            form_data = {
                'owner_name': 'Test User',
                'phone': '3001234567',
                'location': 'Bogotá, Colombia',
                'website_url': 'https://example.com'
            }
            
            # Create test image
            test_image = self.create_test_image()
            files = {'payment_screenshot': ('test_payment.png', test_image, 'image/png')}
            
            response = requests.post(
                f"{self.api_url}/links/submit",
                data=form_data,
                files=files,
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                link_id = data.get('id')
                if link_id:
                    self.created_links.append(link_id)
                details += f", Message: {data.get('message', '')}, ID: {link_id}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Submit Valid Link", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Submit Valid Link", False, str(e))
            return False, {}

    def test_submit_link_prohibited_content(self):
        """Test submitting link with prohibited content"""
        try:
            form_data = {
                'owner_name': 'Test Porno User',  # Contains prohibited word
                'phone': '3001234567',
                'location': 'Bogotá, Colombia',
                'website_url': 'https://example.com'
            }
            
            test_image = self.create_test_image()
            files = {'payment_screenshot': ('test_payment.png', test_image, 'image/png')}
            
            response = requests.post(
                f"{self.api_url}/links/submit",
                data=form_data,
                files=files,
                timeout=15
            )
            
            # Should return 400 for prohibited content
            success = response.status_code == 400
            details = f"Status: {response.status_code}"
            
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Submit Link with Prohibited Content", success, details)
            return success
            
        except Exception as e:
            self.log_test("Submit Link with Prohibited Content", False, str(e))
            return False

    def test_submit_link_invalid_data(self):
        """Test submitting link with invalid data"""
        try:
            form_data = {
                'owner_name': 'A',  # Too short
                'phone': '123',     # Too short
                'location': '',     # Empty
                'website_url': 'invalid-url'  # Invalid URL
            }
            
            test_image = self.create_test_image()
            files = {'payment_screenshot': ('test_payment.png', test_image, 'image/png')}
            
            response = requests.post(
                f"{self.api_url}/links/submit",
                data=form_data,
                files=files,
                timeout=15
            )
            
            # Should return 400 for invalid data
            success = response.status_code == 400
            details = f"Status: {response.status_code}"
            
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Submit Link with Invalid Data", success, details)
            return success
            
        except Exception as e:
            self.log_test("Submit Link with Invalid Data", False, str(e))
            return False

    def test_update_link_status(self, link_id):
        """Test updating link status (approve/reject)"""
        if not link_id:
            self.log_test("Update Link Status", False, "No link ID provided")
            return False
            
        try:
            # Test approve
            update_data = {
                'status': 'approved'
            }
            
            response = requests.put(
                f"{self.api_url}/links/{link_id}",
                json=update_data,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Message: {data.get('message', '')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Update Link Status (Approve)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Update Link Status (Approve)", False, str(e))
            return False

    def test_update_nonexistent_link(self):
        """Test updating non-existent link"""
        try:
            fake_id = "nonexistent-link-id"
            update_data = {
                'status': 'approved'
            }
            
            response = requests.put(
                f"{self.api_url}/links/{fake_id}",
                json=update_data,
                timeout=10
            )
            
            # Should return 404
            success = response.status_code == 404
            details = f"Status: {response.status_code}"
            
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Update Non-existent Link", success, details)
            return success
            
        except Exception as e:
            self.log_test("Update Non-existent Link", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting PAGINA DEL LINK API Tests")
        print("=" * 50)
        
        # Basic connectivity tests
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test GET endpoints
        self.test_get_approved_links()
        self.test_get_all_links()
        self.test_get_stats()
        
        # Test link submission
        success, link_data = self.test_submit_link_valid()
        link_id = link_data.get('id') if success else None
        
        # Test prohibited content filtering
        self.test_submit_link_prohibited_content()
        
        # Test validation
        self.test_submit_link_invalid_data()
        
        # Test admin operations
        if link_id:
            self.test_update_link_status(link_id)
        
        self.test_update_nonexistent_link()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.created_links:
            print(f"   Created Links: {len(self.created_links)}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LinkDirectoryAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())