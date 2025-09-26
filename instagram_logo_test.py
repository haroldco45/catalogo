import requests
import sys
import json
import os
from datetime import datetime
from io import BytesIO
import tempfile

class InstagramLogoTester:
    def __init__(self, base_url="https://panel-logo-editor.preview.emergentagent.com"):
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

    def create_test_image(self):
        """Create a simple test image for payment screenshot"""
        try:
            # Create a simple 100x100 pixel image data (minimal PNG)
            png_data = b'\x89PNG\r\n\x1a\n\rIHDRdd\x08\x02\xff\x80\x02\x03\x19tEXtSoftwareAdobe ImageReadyq\xc9e<\x0eIDATx\xdac\xf8\x0f\x01\x01\x18\xdd\x8d\xb4IEND\xaeB`\x82'
            return BytesIO(png_data)
        except:
            # Fallback: create a text file as image
            return BytesIO(b"fake image data for testing")

    def create_test_logo_image(self, filename="test_logo.png"):
        """Create a test logo image for upload testing"""
        try:
            # Create a simple PNG image data (minimal valid PNG)
            png_data = b'\x89PNG\r\n\x1a\n\rIHDRdd\x08\x02\xff\x80\x02\x03\x19tEXtSoftwareAdobe ImageReadyq\xc9e<\x0eIDATx\xdac\xf8\x0f\x01\x01\x18\xdd\x8d\xb4IEND\xaeB`\x82'
            return BytesIO(png_data)
        except:
            # Fallback: create a text file as image
            return BytesIO(b"fake logo image data for testing")

    def test_instagram_logo_issue(self):
        """Test the specific Instagram logo issue reported by the user"""
        print("🔍 TESTING INSTAGRAM LOGO ISSUE")
        print("=" * 60)
        
        try:
            # Step 1: Find Instagram links in the database
            print("📊 Step 1: Finding Instagram links in database...")
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Instagram Logo Issue - Get Database", False, f"Could not access database: {response.status_code}")
                return False
            
            data = response.json()
            all_links = data.get('links', [])
            
            # Find Instagram links
            instagram_links = []
            for link in all_links:
                website_url = link.get('website_url', '').lower()
                if 'instagram' in website_url:
                    instagram_links.append(link)
            
            print(f"   📊 Found {len(instagram_links)} Instagram links in database")
            
            if len(instagram_links) == 0:
                print("   ⚠️  No Instagram links found. Creating test Instagram links...")
                # Create test Instagram links
                instagram_links = self._create_test_instagram_links()
            
            if not instagram_links:
                self.log_test("Instagram Logo Issue", False, "No Instagram links available for testing")
                return False
            
            # Display Instagram links
            print(f"\n📋 INSTAGRAM LINKS TO TEST:")
            print("-" * 50)
            for i, link in enumerate(instagram_links, 1):
                print(f"{i:2d}. ID: {link.get('id')}")
                print(f"    Owner: {link.get('owner_name')}")
                print(f"    URL: {link.get('website_url')}")
                print(f"    Status: {link.get('status')}")
                print(f"    Custom Logo: {link.get('custom_logo', 'None')}")
                print(f"    Favicon URL: {link.get('favicon_url', 'None')}")
                print()
            
            # Step 2: Test logo upload for each Instagram link
            print("🖼️  Step 2: Testing logo upload for Instagram links...")
            print("-" * 50)
            
            upload_results = []
            for i, link in enumerate(instagram_links, 1):
                link_id = link.get('id')
                owner_name = link.get('owner_name', 'Unknown')
                
                print(f"Testing {i}/{len(instagram_links)}: {owner_name} (ID: {link_id[:8]}...)")
                
                # Upload logo
                success, result = self.test_logo_upload_endpoint(link_id, f"Instagram Logo Upload #{i}")
                upload_results.append({
                    'link_id': link_id,
                    'owner_name': owner_name,
                    'upload_success': success,
                    'result': result
                })
            
            # Step 3: Verify custom_logo field is updated in database
            print(f"\n🔍 Step 3: Verifying custom_logo field updates in database...")
            print("-" * 50)
            
            response = requests.get(f"{self.api_url}/admin/status", timeout=10)
            if response.status_code != 200:
                self.log_test("Instagram Logo Issue - Verify Updates", False, "Could not verify database updates")
                return False
            
            updated_data = response.json()
            updated_links = updated_data.get('links', [])
            
            # Find our Instagram links again
            updated_instagram_links = []
            for link in updated_links:
                website_url = link.get('website_url', '').lower()
                if 'instagram' in website_url:
                    updated_instagram_links.append(link)
            
            print(f"📊 CUSTOM_LOGO FIELD VERIFICATION:")
            custom_logo_updated_count = 0
            for link in updated_instagram_links:
                link_id = link.get('id')
                owner_name = link.get('owner_name')
                custom_logo = link.get('custom_logo')
                
                if custom_logo:
                    print(f"   ✅ {owner_name} (ID: {link_id[:8]}...): custom_logo = {custom_logo}")
                    custom_logo_updated_count += 1
                else:
                    print(f"   ❌ {owner_name} (ID: {link_id[:8]}...): custom_logo = None/Empty")
            
            print(f"\n📊 CUSTOM_LOGO UPDATE RESULTS:")
            print(f"   Instagram links with custom_logo: {custom_logo_updated_count}/{len(updated_instagram_links)}")
            
            # Step 4: Check if uploaded images exist in /app/backend/uploads/
            print(f"\n📁 Step 4: Checking uploaded images in /app/backend/uploads/...")
            print("-" * 50)
            
            uploads_accessible = 0
            for link in updated_instagram_links:
                custom_logo = link.get('custom_logo')
                if custom_logo:
                    # Check if file exists
                    file_path = f"/app/backend/uploads/{custom_logo}"
                    try:
                        if os.path.exists(file_path):
                            file_size = os.path.getsize(file_path)
                            print(f"   ✅ {custom_logo}: EXISTS ({file_size} bytes)")
                            uploads_accessible += 1
                        else:
                            print(f"   ❌ {custom_logo}: FILE NOT FOUND")
                    except Exception as e:
                        print(f"   ❌ {custom_logo}: ERROR checking file - {e}")
            
            print(f"\n📊 UPLOADED FILES VERIFICATION:")
            print(f"   Accessible uploaded files: {uploads_accessible}/{custom_logo_updated_count}")
            
            # Step 5: Test direct access to uploaded images via GET /uploads/{filename}
            print(f"\n🌐 Step 5: Testing direct access to uploaded images via GET /uploads/{{filename}}...")
            print("-" * 50)
            
            url_accessible_count = 0
            for link in updated_instagram_links:
                custom_logo = link.get('custom_logo')
                if custom_logo:
                    # Test direct URL access
                    image_url = f"{self.base_url}/uploads/{custom_logo}"
                    try:
                        response = requests.get(image_url, timeout=10)
                        if response.status_code == 200:
                            content_type = response.headers.get('content-type', '')
                            print(f"   ✅ {custom_logo}: ACCESSIBLE (Status: {response.status_code}, Type: {content_type})")
                            url_accessible_count += 1
                        else:
                            print(f"   ❌ {custom_logo}: NOT ACCESSIBLE (Status: {response.status_code})")
                    except Exception as e:
                        print(f"   ❌ {custom_logo}: ERROR accessing URL - {e}")
            
            print(f"\n📊 URL ACCESSIBILITY VERIFICATION:")
            print(f"   Accessible via URL: {url_accessible_count}/{custom_logo_updated_count}")
            
            # Step 6: Test GET /api/links endpoint returns updated data with custom_logo
            print(f"\n📡 Step 6: Testing GET /api/links endpoint returns updated data...")
            print("-" * 50)
            
            response = requests.get(f"{self.api_url}/links?status=approved", timeout=10)
            if response.status_code != 200:
                print(f"   ❌ GET /api/links failed: {response.status_code}")
                api_data_correct = False
            else:
                api_links = response.json()
                api_instagram_links = [link for link in api_links if 'instagram' in link.get('website_url', '').lower()]
                
                print(f"   📊 GET /api/links returned {len(api_links)} total links")
                print(f"   📊 Instagram links in API response: {len(api_instagram_links)}")
                
                api_custom_logo_count = 0
                for link in api_instagram_links:
                    custom_logo = link.get('custom_logo')
                    owner_name = link.get('owner_name')
                    if custom_logo:
                        print(f"   ✅ {owner_name}: custom_logo = {custom_logo}")
                        api_custom_logo_count += 1
                    else:
                        print(f"   ❌ {owner_name}: custom_logo = None/Empty")
                
                print(f"\n📊 API ENDPOINT DATA VERIFICATION:")
                print(f"   Instagram links with custom_logo in API: {api_custom_logo_count}/{len(api_instagram_links)}")
                api_data_correct = (api_custom_logo_count > 0)
            
            # Final Assessment
            print(f"\n📊 FINAL ASSESSMENT - INSTAGRAM LOGO ISSUE:")
            print("=" * 60)
            
            issues_found = []
            
            if custom_logo_updated_count == 0:
                issues_found.append("❌ custom_logo field not being updated in database")
            else:
                print(f"✅ custom_logo field updates: {custom_logo_updated_count}/{len(updated_instagram_links)} Instagram links")
            
            if uploads_accessible < custom_logo_updated_count:
                issues_found.append(f"❌ Uploaded files not accessible: {uploads_accessible}/{custom_logo_updated_count}")
            else:
                print(f"✅ Uploaded files accessible: {uploads_accessible}/{custom_logo_updated_count}")
            
            if url_accessible_count < custom_logo_updated_count:
                issues_found.append(f"❌ Images not accessible via URL: {url_accessible_count}/{custom_logo_updated_count}")
            else:
                print(f"✅ Images accessible via URL: {url_accessible_count}/{custom_logo_updated_count}")
            
            if not api_data_correct:
                issues_found.append("❌ GET /api/links not returning updated custom_logo data")
            else:
                print(f"✅ GET /api/links returns updated custom_logo data")
            
            if issues_found:
                print(f"\n🚨 ISSUES IDENTIFIED:")
                for issue in issues_found:
                    print(f"   {issue}")
                
                self.log_test("Instagram Logo Issue Investigation", False, f"{len(issues_found)} issues found: {'; '.join(issues_found)}")
                return False
            else:
                print(f"\n✅ NO ISSUES FOUND - Instagram logo functionality working correctly")
                self.log_test("Instagram Logo Issue Investigation", True, f"All tests passed: {custom_logo_updated_count} Instagram links with working logo upload")
                return True
                
        except Exception as e:
            self.log_test("Instagram Logo Issue Investigation", False, str(e))
            return False

    def test_logo_upload_endpoint(self, link_id, test_name="Logo Upload"):
        """Test the PUT /api/links/{link_id}/logo endpoint"""
        try:
            print(f"🖼️  TESTING LOGO UPLOAD FOR LINK: {link_id[:8]}...")
            
            # Create test logo
            test_logo = self.create_test_logo_image()
            files = {'custom_logo': ('test_logo.png', test_logo, 'image/png')}
            
            response = requests.put(
                f"{self.api_url}/links/{link_id}/logo",
                files=files,
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Message: {data.get('message', '')}"
                print(f"   ✅ Logo upload successful: {data.get('message', '')}")
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                    print(f"   ❌ Logo upload failed: {error_data.get('detail', 'Unknown error')}")
                except:
                    details += f", Response: {response.text[:100]}"
                    print(f"   ❌ Logo upload failed: {response.text[:100]}")
            
            self.log_test(f"{test_name} (ID: {link_id[:8]}...)", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            print(f"   ❌ Exception during logo upload: {e}")
            self.log_test(f"{test_name} (ID: {link_id[:8]}...)", False, str(e))
            return False, {}

    def _create_test_instagram_links(self):
        """Create test Instagram links for testing"""
        print("📱 Creating test Instagram links...")
        
        instagram_test_data = [
            {
                'owner_name': 'Instagram Test User 1',
                'phone': '3001234567',
                'location': 'Bogotá, Colombia',
                'website_url': 'https://www.instagram.com/testuser1'
            },
            {
                'owner_name': 'Instagram Test User 2', 
                'phone': '3007654321',
                'location': 'Medellín, Colombia',
                'website_url': 'https://instagram.com/testuser2'
            }
        ]
        
        created_links = []
        
        for i, data in enumerate(instagram_test_data, 1):
            try:
                print(f"   Creating Instagram test link {i}...")
                
                test_image = self.create_test_image()
                files = {'payment_screenshot': ('test_payment.png', test_image, 'image/png')}
                
                response = requests.post(
                    f"{self.api_url}/links/submit",
                    data=data,
                    files=files,
                    timeout=15
                )
                
                if response.status_code == 200:
                    result = response.json()
                    link_id = result.get('id')
                    if link_id:
                        self.created_links.append(link_id)
                        
                        # Approve the link so it appears in main results
                        approve_data = {"status": "approved"}
                        approve_response = requests.put(
                            f"{self.api_url}/links/{link_id}",
                            json=approve_data,
                            timeout=10
                        )
                        
                        if approve_response.status_code == 200:
                            created_links.append({
                                'id': link_id,
                                'owner_name': data['owner_name'],
                                'website_url': data['website_url'],
                                'status': 'approved',
                                'custom_logo': None,
                                'favicon_url': None
                            })
                            print(f"   ✅ Created and approved: {data['owner_name']} (ID: {link_id[:8]}...)")
                        else:
                            print(f"   ⚠️  Created but not approved: {data['owner_name']}")
                    else:
                        print(f"   ❌ Failed to get link ID for: {data['owner_name']}")
                else:
                    print(f"   ❌ Failed to create: {data['owner_name']} (Status: {response.status_code})")
                    
            except Exception as e:
                print(f"   ❌ Exception creating {data['owner_name']}: {e}")
        
        print(f"   📊 Successfully created {len(created_links)} Instagram test links")
        return created_links

if __name__ == "__main__":
    tester = InstagramLogoTester()
    tester.test_instagram_logo_issue()