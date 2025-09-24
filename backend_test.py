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

    def test_admin_dashboard(self):
        """Test admin dashboard endpoint - should return ALL links with stats"""
        try:
            response = requests.get(f"{self.api_url}/admin/dashboard", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                links = data.get('links', [])
                stats = data.get('stats', {})
                details += f", Total links: {len(links)}, Success: {data.get('success', False)}"
                details += f", Stats - Total: {stats.get('total_submissions', 0)}, Approved: {stats.get('approved', 0)}, Pending: {stats.get('pending', 0)}, Rejected: {stats.get('rejected', 0)}"
            self.log_test("Admin Dashboard Endpoint", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Admin Dashboard Endpoint", False, str(e))
            return False, {}

    def test_links_manage(self):
        """Test links/manage endpoint - should return all links for management"""
        try:
            response = requests.get(f"{self.api_url}/links/manage", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Total links: {len(data)}"
                # Check if we have links with different statuses
                statuses = set(link.get('status', 'unknown') for link in data)
                details += f", Statuses found: {list(statuses)}"
            self.log_test("Links Manage Endpoint", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Links Manage Endpoint", False, str(e))
            return False, []

    def test_links_by_status(self):
        """Test links endpoint with different status parameters"""
        results = {}
        
        # Test default (approved)
        try:
            response = requests.get(f"{self.api_url}/links", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                results['default'] = data
                details += f", Default links count: {len(data)}"
            self.log_test("Links Endpoint (Default/Approved)", success, details)
        except Exception as e:
            self.log_test("Links Endpoint (Default/Approved)", False, str(e))
            results['default'] = []

        # Test approved explicitly
        try:
            response = requests.get(f"{self.api_url}/links?status=approved", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                results['approved'] = data
                details += f", Approved links count: {len(data)}"
            self.log_test("Links Endpoint (Approved)", success, details)
        except Exception as e:
            self.log_test("Links Endpoint (Approved)", False, str(e))
            results['approved'] = []

        # Test pending
        try:
            response = requests.get(f"{self.api_url}/links?status=pending", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                results['pending'] = data
                details += f", Pending links count: {len(data)}"
            self.log_test("Links Endpoint (Pending)", success, details)
        except Exception as e:
            self.log_test("Links Endpoint (Pending)", False, str(e))
            results['pending'] = []

        # Test rejected
        try:
            response = requests.get(f"{self.api_url}/links?status=rejected", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                results['rejected'] = data
                details += f", Rejected links count: {len(data)}"
            self.log_test("Links Endpoint (Rejected)", success, details)
        except Exception as e:
            self.log_test("Links Endpoint (Rejected)", False, str(e))
            results['rejected'] = []

        return results

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

    def test_admin_status_detailed(self):
        """Test admin status endpoint and provide detailed link analysis"""
        try:
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                links = data.get('links', [])
                total_links = data.get('total_links', 0)
                approved = data.get('approved', 0)
                pending = data.get('pending', 0)
                rejected = data.get('rejected', 0)
                
                details += f", Total: {total_links}, Approved: {approved}, Pending: {pending}, Rejected: {rejected}"
                
                print(f"\n🔍 DETAILED DATABASE ANALYSIS")
                print("=" * 60)
                print(f"📊 TOTAL LINKS IN DATABASE: {total_links}")
                print(f"📊 BREAKDOWN: {approved} approved, {pending} pending, {rejected} rejected")
                print()
                
                # Identify example.com links
                example_links = []
                test_user_links = []
                other_test_links = []
                
                for link in links:
                    website_url = link.get('website_url', '').lower()
                    owner_name = link.get('owner_name', '').lower()
                    
                    if 'example.com' in website_url:
                        example_links.append(link)
                    
                    if 'test' in owner_name:
                        if 'test user' in owner_name:
                            test_user_links.append(link)
                        elif 'porno' in owner_name:
                            other_test_links.append(link)
                        else:
                            other_test_links.append(link)
                
                print(f"🎯 LINKS THAT NEED TO BE ELIMINATED:")
                print(f"   - Links with 'example.com': {len(example_links)}")
                print(f"   - Links with 'Test User': {len(test_user_links)}")
                print(f"   - Other test links: {len(other_test_links)}")
                print()
                
                # Show first 10 links with complete details
                print("📋 FIRST 10 LINKS IN DATABASE:")
                print("-" * 80)
                for i, link in enumerate(links[:10], 1):
                    link_id = link.get('id', 'N/A')
                    owner_name = link.get('owner_name', 'N/A')
                    website_url = link.get('website_url', 'N/A')
                    status = link.get('status', 'N/A')
                    created_at = link.get('created_at', 'N/A')
                    
                    # Highlight problematic links
                    flag = ""
                    if 'example.com' in website_url.lower():
                        flag = " ⚠️ EXAMPLE.COM"
                    elif 'test' in owner_name.lower():
                        flag = " ⚠️ TEST USER"
                    
                    print(f"{i:2d}. ID: {link_id}")
                    print(f"    Owner: {owner_name}{flag}")
                    print(f"    URL: {website_url}")
                    print(f"    Status: {status}")
                    print(f"    Created: {created_at}")
                    print()
                
                # Show all example.com links
                if example_links:
                    print("🚨 ALL EXAMPLE.COM LINKS THAT NEED DELETION:")
                    print("-" * 60)
                    for i, link in enumerate(example_links, 1):
                        print(f"{i}. ID: {link.get('id')}")
                        print(f"   Owner: {link.get('owner_name')}")
                        print(f"   URL: {link.get('website_url')}")
                        print(f"   Status: {link.get('status')}")
                        print()
                
                # Show all test user links
                if test_user_links or other_test_links:
                    print("🚨 ALL TEST USER LINKS THAT NEED DELETION:")
                    print("-" * 60)
                    all_test_links = test_user_links + other_test_links
                    for i, link in enumerate(all_test_links, 1):
                        print(f"{i}. ID: {link.get('id')}")
                        print(f"   Owner: {link.get('owner_name')}")
                        print(f"   URL: {link.get('website_url')}")
                        print(f"   Status: {link.get('status')}")
                        print()
                
                # Summary of what needs to be deleted
                total_to_delete = len(example_links) + len(test_user_links) + len(other_test_links)
                print(f"📊 SUMMARY:")
                print(f"   Total links in database: {total_links}")
                print(f"   Links that need deletion: {total_to_delete}")
                print(f"   Links that will remain: {total_links - total_to_delete}")
                
            self.log_test("Admin Status Detailed Analysis", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Admin Status Detailed Analysis", False, str(e))
            return False, {}

    def run_database_verification(self):
        """Run database verification focused on identifying test data"""
        print("🔍 DATABASE VERIFICATION - IDENTIFYING TEST DATA")
        print("=" * 60)
        
        # Basic connectivity test
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping verification.")
            return False
        
        # Run detailed admin status analysis
        success, data = self.test_admin_status_detailed()
        
        if not success:
            print("❌ Could not retrieve database information")
            return False
        
        print("\n✅ DATABASE VERIFICATION COMPLETE")
        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting PAGINA DEL LINK API Tests - ADMIN PANEL FOCUS")
        print("=" * 60)
        
        # Basic connectivity tests
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        print("\n🔍 ADMIN PANEL ENDPOINT TESTING")
        print("-" * 40)
        
        # Test the main admin dashboard endpoint
        admin_success, admin_data = self.test_admin_dashboard()
        
        # Test the fallback manage endpoint
        manage_success, manage_data = self.test_links_manage()
        
        # Test links endpoint with different statuses
        print("\n🔍 LINKS ENDPOINT STATUS TESTING")
        print("-" * 40)
        status_results = self.test_links_by_status()
        
        # Test stats endpoint
        stats_success, stats_data = self.test_get_stats()
        
        print("\n🔍 DATA CONSISTENCY ANALYSIS")
        print("-" * 40)
        
        # Analyze data consistency
        if admin_success and manage_success:
            admin_links = admin_data.get('links', [])
            manage_links = manage_data
            admin_stats = admin_data.get('stats', {})
            
            print(f"📊 Admin Dashboard: {len(admin_links)} links, Stats Total: {admin_stats.get('total_submissions', 0)}")
            print(f"📊 Manage Endpoint: {len(manage_links)} links")
            print(f"📊 Approved Links: {len(status_results.get('approved', []))}")
            print(f"📊 Pending Links: {len(status_results.get('pending', []))}")
            print(f"📊 Rejected Links: {len(status_results.get('rejected', []))}")
            
            # Check consistency
            total_by_status = len(status_results.get('approved', [])) + len(status_results.get('pending', [])) + len(status_results.get('rejected', []))
            
            if len(admin_links) == len(manage_links) == total_by_status:
                print("✅ Data consistency: All endpoints return consistent counts")
                self.log_test("Data Consistency Check", True, f"All endpoints consistent with {len(admin_links)} total links")
            else:
                print(f"❌ Data inconsistency detected:")
                print(f"   Admin dashboard: {len(admin_links)} links")
                print(f"   Manage endpoint: {len(manage_links)} links") 
                print(f"   Sum by status: {total_by_status} links")
                self.log_test("Data Consistency Check", False, f"Inconsistent counts: admin={len(admin_links)}, manage={len(manage_links)}, status_sum={total_by_status}")
        
        print("\n🔍 ADDITIONAL FUNCTIONALITY TESTS")
        print("-" * 40)
        
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
        print("\n" + "=" * 60)
        print(f"📊 ADMIN PANEL TEST SUMMARY:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.created_links:
            print(f"   Created Links: {len(self.created_links)}")
        
        # Specific admin panel assessment
        critical_tests_passed = admin_success and manage_success
        print(f"\n🎯 CRITICAL ADMIN ENDPOINTS: {'✅ WORKING' if critical_tests_passed else '❌ FAILING'}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LinkDirectoryAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())