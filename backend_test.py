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

    def test_delete_link(self, link_id):
        """Test deleting a specific link by ID"""
        try:
            response = requests.delete(f"{self.api_url}/links/{link_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}, Message: {data.get('message', '')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('error', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test(f"Delete Link {link_id[:8]}...", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test(f"Delete Link {link_id[:8]}...", False, str(e))
            return False, {}

    def delete_test_links_batch(self):
        """Delete all identified test links from the database"""
        print("🗑️  DELETING TEST LINKS FROM DATABASE")
        print("=" * 60)
        
        # First, get current database state
        try:
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            if response.status_code != 200:
                print("❌ Could not retrieve database information")
                return False
                
            data = response.json()
            links = data.get('links', [])
            total_before = len(links)
            
            print(f"📊 BEFORE DELETION: {total_before} total links")
            
            # Identify test links to delete
            test_links_to_delete = []
            
            # Specific IDs mentioned in the request
            specific_ids = [
                "9754de9c-d108-4b80-8481-f3b4652fc7db",  # Test Porno User - example.com
                "df281af5-effc-49cf-81a5-716033516f41",  # Test User - example.com  
                "a86bf7f7-3dd6-48c5-8196-a92f65ed257e",  # Test Porno User - example.com
                "753722dc-dd29-4b05-95a2-f55501663de1",  # Test User - example.com
                "8e8df112-bc6e-4586-a31a-9f8e8e58034f",  # Test User - example.com
                "786dfd74-ba7a-4ede-9b38-2b9ede72b3bf"   # Test User Frontend - google.com
            ]
            
            # Find all test links in database
            for link in links:
                link_id = link.get('id', '')
                owner_name = link.get('owner_name', '').lower()
                website_url = link.get('website_url', '').lower()
                
                # Check if it's a test link
                is_test_link = False
                reason = ""
                
                # Check specific IDs first
                if link_id in specific_ids:
                    is_test_link = True
                    reason = "Specific ID in deletion list"
                # Check for example.com URLs
                elif 'example.com' in website_url:
                    is_test_link = True
                    reason = "example.com URL"
                # Check for test users
                elif 'test' in owner_name:
                    is_test_link = True
                    reason = "Test user name"
                
                if is_test_link:
                    test_links_to_delete.append({
                        'id': link_id,
                        'owner_name': link.get('owner_name', ''),
                        'website_url': link.get('website_url', ''),
                        'reason': reason
                    })
            
            print(f"🎯 IDENTIFIED {len(test_links_to_delete)} TEST LINKS FOR DELETION:")
            print("-" * 60)
            
            for i, link in enumerate(test_links_to_delete, 1):
                print(f"{i:2d}. ID: {link['id']}")
                print(f"    Owner: {link['owner_name']}")
                print(f"    URL: {link['website_url']}")
                print(f"    Reason: {link['reason']}")
                print()
            
            # Perform deletions
            deleted_count = 0
            failed_deletions = []
            
            print("🗑️  STARTING DELETION PROCESS...")
            print("-" * 40)
            
            for link in test_links_to_delete:
                link_id = link['id']
                owner_name = link['owner_name']
                
                print(f"Deleting: {owner_name} ({link_id[:8]}...)")
                success, result = self.test_delete_link(link_id)
                
                if success:
                    deleted_count += 1
                    print(f"  ✅ Successfully deleted")
                else:
                    failed_deletions.append(link)
                    print(f"  ❌ Failed to delete")
            
            print(f"\n📊 DELETION RESULTS:")
            print(f"   Successfully deleted: {deleted_count}")
            print(f"   Failed deletions: {len(failed_deletions)}")
            
            if failed_deletions:
                print(f"\n❌ FAILED DELETIONS:")
                for link in failed_deletions:
                    print(f"   - {link['owner_name']} ({link['id']})")
            
            # Verify final state
            print(f"\n🔍 VERIFYING FINAL DATABASE STATE...")
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            if response.status_code == 200:
                final_data = response.json()
                final_links = final_data.get('links', [])
                total_after = len(final_links)
                
                print(f"📊 AFTER DELETION: {total_after} total links")
                print(f"📊 LINKS REMOVED: {total_before - total_after}")
                
                # Check for remaining test links
                remaining_test_links = []
                for link in final_links:
                    owner_name = link.get('owner_name', '').lower()
                    website_url = link.get('website_url', '').lower()
                    
                    if 'example.com' in website_url or 'test' in owner_name:
                        remaining_test_links.append(link)
                
                if remaining_test_links:
                    print(f"\n⚠️  WARNING: {len(remaining_test_links)} TEST LINKS STILL REMAIN:")
                    for link in remaining_test_links:
                        print(f"   - {link.get('owner_name')} - {link.get('website_url')} ({link.get('id')})")
                else:
                    print(f"\n✅ SUCCESS: No test links remaining in database")
                
                # Show breakdown of remaining links
                approved = final_data.get('approved', 0)
                pending = final_data.get('pending', 0)
                rejected = final_data.get('rejected', 0)
                
                print(f"\n📊 FINAL DATABASE BREAKDOWN:")
                print(f"   Total links: {total_after}")
                print(f"   Approved: {approved}")
                print(f"   Pending: {pending}")
                print(f"   Rejected: {rejected}")
                
                # Success criteria
                deletion_successful = (deleted_count > 0 and len(remaining_test_links) == 0)
                
                self.log_test("Test Links Deletion", deletion_successful, 
                             f"Deleted {deleted_count} test links, {len(remaining_test_links)} remaining")
                
                return deletion_successful
            else:
                print("❌ Could not verify final database state")
                return False
                
        except Exception as e:
            print(f"❌ Error during deletion process: {e}")
            self.log_test("Test Links Deletion", False, str(e))
            return False

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

    def run_test_link_deletion(self):
        """Run test link deletion process"""
        print("🗑️  TEST LINK DELETION PROCESS")
        print("=" * 60)
        
        # Basic connectivity test
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping deletion.")
            return False
        
        # Run the deletion process
        success = self.delete_test_links_batch()
        
        if success:
            print("\n✅ TEST LINK DELETION COMPLETED SUCCESSFULLY")
        else:
            print("\n❌ TEST LINK DELETION FAILED OR INCOMPLETE")
        
        return success

    def run_manual_approval_test(self):
        """Run manual approval workflow test"""
        print("🎯 MANUAL APPROVAL WORKFLOW TEST")
        print("=" * 60)
        
        # Basic connectivity test
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping test.")
            return False
        
        # Run the manual approval workflow test
        success = self.test_manual_approval_workflow()
        
        if success:
            print("\n✅ MANUAL APPROVAL WORKFLOW TEST COMPLETED SUCCESSFULLY")
        else:
            print("\n❌ MANUAL APPROVAL WORKFLOW TEST FAILED")
        
        return success

    def test_manual_approval_workflow(self):
        """Test the manual approval workflow for pending links"""
        print("🎯 TESTING MANUAL APPROVAL WORKFLOW")
        print("=" * 60)
        
        try:
            # Step 1: Get current status using /api/admin/status
            print("📊 Step 1: Getting current database status...")
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Manual Approval - Get Status", False, f"Status endpoint failed: {response.status_code}")
                return False
            
            data = response.json()
            total_links = data.get('total_links', 0)
            approved_before = data.get('approved', 0)
            pending_before = data.get('pending', 0)
            rejected_before = data.get('rejected', 0)
            links = data.get('links', [])
            
            print(f"   📊 Current state: {total_links} total, {approved_before} approved, {pending_before} pending, {rejected_before} rejected")
            
            # Step 2: Find pending links
            pending_links = [link for link in links if link.get('status') == 'pending']
            
            if not pending_links:
                print("   ⚠️  No pending links found to approve")
                self.log_test("Manual Approval - Find Pending", False, "No pending links available for approval")
                return False
            
            print(f"   🔍 Found {len(pending_links)} pending link(s):")
            for i, link in enumerate(pending_links, 1):
                print(f"      {i}. ID: {link.get('id')}")
                print(f"         Owner: {link.get('owner_name')}")
                print(f"         URL: {link.get('website_url')}")
                print(f"         Created: {link.get('created_at')}")
                print()
            
            # Step 3: Approve the first pending link
            link_to_approve = pending_links[0]
            link_id = link_to_approve.get('id')
            owner_name = link_to_approve.get('owner_name')
            
            print(f"📝 Step 2: Approving link from {owner_name} (ID: {link_id[:8]}...)")
            
            update_data = {"status": "approved"}
            response = requests.put(
                f"{self.api_url}/links/{link_id}",
                json=update_data,
                timeout=10
            )
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', 'Unknown error')
                except:
                    error_msg = response.text[:100]
                self.log_test("Manual Approval - Approve Link", False, f"Approval failed: {error_msg}")
                return False
            
            approval_result = response.json()
            print(f"   ✅ {approval_result.get('message', 'Link approved successfully')}")
            
            # Step 4: Verify the changes
            print("🔍 Step 3: Verifying approval changes...")
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Manual Approval - Verify Changes", False, "Could not verify changes")
                return False
            
            new_data = response.json()
            approved_after = new_data.get('approved', 0)
            pending_after = new_data.get('pending', 0)
            total_after = new_data.get('total_links', 0)
            
            print(f"   📊 After approval: {total_after} total, {approved_after} approved, {pending_after} pending")
            
            # Verify the counts changed correctly
            expected_approved = approved_before + 1
            expected_pending = pending_before - 1
            
            approval_success = (approved_after == expected_approved and pending_after == expected_pending)
            
            if approval_success:
                print(f"   ✅ Counts updated correctly:")
                print(f"      Approved: {approved_before} → {approved_after} (+1)")
                print(f"      Pending: {pending_before} → {pending_after} (-1)")
                
                # Step 5: Verify main page will show the new approved link
                print("🌐 Step 4: Verifying main page will show approved links...")
                response = requests.get(f"{self.api_url}/links?status=approved", timeout=10)
                
                if response.status_code == 200:
                    approved_links = response.json()
                    main_page_count = len(approved_links)
                    print(f"   📊 Main page will show {main_page_count} approved links")
                    
                    # Check if our newly approved link is in the list
                    newly_approved_found = any(link.get('id') == link_id for link in approved_links)
                    if newly_approved_found:
                        print(f"   ✅ Newly approved link is included in main page results")
                    else:
                        print(f"   ⚠️  Newly approved link not found in main page results")
                    
                    # Calculate revenue
                    revenue = main_page_count * 1  # $1 per approved link
                    print(f"   💰 Estimated revenue: ${revenue} USD")
                    
                    self.log_test("Manual Approval Workflow", True, 
                                f"Successfully approved 1 link. Approved count: {approved_before}→{approved_after}, Main page links: {main_page_count}, Revenue: ${revenue}")
                    
                    return True
                else:
                    print(f"   ❌ Could not verify main page links (status: {response.status_code})")
                    self.log_test("Manual Approval Workflow", False, "Could not verify main page links")
                    return False
            else:
                print(f"   ❌ Counts did not update correctly:")
                print(f"      Expected approved: {expected_approved}, got: {approved_after}")
                print(f"      Expected pending: {expected_pending}, got: {pending_after}")
                self.log_test("Manual Approval Workflow", False, 
                            f"Count mismatch - expected approved: {expected_approved}, got: {approved_after}")
                return False
                
        except Exception as e:
            self.log_test("Manual Approval Workflow", False, str(e))
            return False

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
    import sys
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "verify":
            # Run database verification only
            tester = LinkDirectoryAPITester()
            success = tester.run_database_verification()
            return 0 if success else 1
        elif command == "delete":
            # Run test link deletion
            tester = LinkDirectoryAPITester()
            success = tester.run_test_link_deletion()
            return 0 if success else 1
        elif command == "approve":
            # Run manual approval workflow test
            tester = LinkDirectoryAPITester()
            success = tester.run_manual_approval_test()
            return 0 if success else 1
        else:
            print("Usage: python backend_test.py [verify|delete|approve]")
            return 1
    else:
        # Run all tests
        tester = LinkDirectoryAPITester()
        success = tester.run_all_tests()
        return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())