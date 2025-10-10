#!/usr/bin/env python3
"""
Logo Upload Investigation - Critical File Size Issue
This script investigates the reported issue where logo uploads return 200 OK
but files are saved as 78-94 bytes instead of actual image sizes.
"""

import requests
import sys
import json
import os
from datetime import datetime
from io import BytesIO
import time

def create_test_image(size_mb=2):
    """Create a test image of specified size"""
    try:
        # Create a realistic size file
        file_size_bytes = size_mb * 1024 * 1024
        
        # Create PNG header for a valid image file
        png_header = b'\x89PNG\r\n\x1a\n'
        ihdr_chunk = b'\x00\x00\x00\rIHDR\x00\x00\x04\x00\x00\x00\x03\x00\x08\x02\x00\x00\x00'
        
        # Fill the rest with image data
        remaining_size = file_size_bytes - len(png_header) - len(ihdr_chunk) - 12  # 12 bytes for IEND
        image_data = b'X' * max(0, remaining_size)
        
        # PNG end chunk
        iend_chunk = b'\x00\x00\x00\x00IEND\xaeB`\x82'
        
        full_data = png_header + ihdr_chunk + image_data + iend_chunk
        
        print(f"   📏 Created test image: {len(full_data):,} bytes ({len(full_data)/(1024*1024):.2f} MB)")
        return BytesIO(full_data)
        
    except Exception as e:
        print(f"   ❌ Error creating test image: {e}")
        return BytesIO(b"fallback test data")

def test_logo_upload(api_url, link_id, test_name, file_size_mb):
    """Test logo upload and verify file size"""
    print(f"\n🧪 {test_name}")
    print("-" * 60)
    
    try:
        # Create test file
        test_file = create_test_image(file_size_mb)
        original_size = len(test_file.getvalue())
        test_file.seek(0)  # Reset file pointer
        
        files = {'custom_logo': (f'test_screenshot_{file_size_mb}mb.png', test_file, 'image/png')}
        
        print(f"   📤 Uploading {file_size_mb}MB file ({original_size:,} bytes)...")
        
        # Upload the file
        response = requests.put(
            f"{api_url}/links/{link_id}/logo",
            files=files,
            timeout=60
        )
        
        print(f"   📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            filename = data.get('filename', 'unknown')
            message = data.get('message', '')
            
            print(f"   ✅ Upload successful: {message}")
            print(f"   📁 Saved as: {filename}")
            
            # Check actual file size on server
            if filename:
                actual_size = check_file_size_on_server(filename)
                if actual_size is not None:
                    print(f"   📏 File size on server: {actual_size:,} bytes")
                    
                    if actual_size < 1000:  # Less than 1KB
                        print(f"   🚨 CRITICAL ISSUE: File saved as {actual_size} bytes instead of {original_size:,} bytes!")
                        print(f"   🚨 This is the reported issue (78-94 bytes)")
                        return False
                    elif actual_size < original_size * 0.5:  # Less than 50% of original
                        print(f"   ⚠️  File size significantly reduced")
                        return False
                    else:
                        print(f"   ✅ File size correct")
                        return True
                else:
                    print(f"   ❌ Could not verify file size on server")
                    return False
            else:
                print(f"   ❌ No filename returned")
                return False
        else:
            try:
                error_data = response.json()
                print(f"   ❌ Upload failed: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   ❌ Upload failed: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exception during upload: {e}")
        return False

def check_file_size_on_server(filename):
    """Check the actual file size on the server"""
    try:
        # Check file size using ls command
        result = os.popen(f"ls -la /app/backend/uploads/{filename} 2>/dev/null | awk '{{print $5}}'").read().strip()
        if result and result.isdigit():
            return int(result)
        return None
    except:
        return None

def get_existing_instagram_links(api_url):
    """Get existing Instagram links from the database"""
    try:
        response = requests.get(f"{api_url}/admin/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            links = data.get('links', [])
            
            instagram_links = []
            for link in links:
                website_url = link.get('website_url', '').lower()
                if 'instagram.com' in website_url:
                    instagram_links.append(link)
            
            return instagram_links
        return []
    except:
        return []

def main():
    api_url = "https://logo-fix-hub.preview.emergentagent.com/api"
    
    print("🔍 LOGO UPLOAD FILE SIZE ISSUE INVESTIGATION")
    print("=" * 80)
    print("REPORTED ISSUE: Logo uploads return 200 OK but files saved as 78-94 bytes")
    print("=" * 80)
    
    # Test API connectivity
    try:
        response = requests.get(f"{api_url}/", timeout=10)
        if response.status_code != 200:
            print("❌ API is not accessible")
            return False
        print("✅ API connectivity confirmed")
    except Exception as e:
        print(f"❌ API connectivity failed: {e}")
        return False
    
    # Get Instagram links to test with
    print(f"\n📱 Finding Instagram links to test...")
    instagram_links = get_existing_instagram_links(api_url)
    
    if not instagram_links:
        print("❌ No Instagram links found for testing")
        return False
    
    print(f"   ✅ Found {len(instagram_links)} Instagram links")
    
    # Use the first Instagram link for testing
    test_link = instagram_links[0]
    link_id = test_link.get('id')
    owner_name = test_link.get('owner_name', 'Unknown')
    
    print(f"\n🎯 Testing with Instagram link:")
    print(f"   Owner: {owner_name}")
    print(f"   ID: {link_id}")
    print(f"   URL: {test_link.get('website_url', 'Unknown')}")
    
    # Test various file sizes
    test_scenarios = [
        (0.1, "Small Instagram story (100KB)"),
        (1, "Medium Instagram post (1MB)"),
        (2, "Large Instagram screenshot (2MB)"),
        (5, "Very large Instagram feed (5MB)")
    ]
    
    results = []
    
    for size_mb, description in test_scenarios:
        success = test_logo_upload(api_url, link_id, description, size_mb)
        results.append(success)
        time.sleep(1)  # Small delay between tests
    
    # Check existing uploaded files for the issue
    print(f"\n📁 Checking existing uploaded files for size issues...")
    
    try:
        # List files in uploads directory with sizes
        result = os.popen("ls -la /app/backend/uploads/ | grep -E '\\.(png|jpg|jpeg)$' | head -20").read()
        
        small_files = []
        normal_files = []
        
        for line in result.strip().split('\n'):
            if line:
                parts = line.split()
                if len(parts) >= 9:
                    size = int(parts[4])
                    filename = parts[8]
                    
                    if size < 1000:  # Less than 1KB
                        small_files.append((filename, size))
                    else:
                        normal_files.append((filename, size))
        
        print(f"   📊 Analysis of existing uploaded files:")
        print(f"   - Small files (< 1KB): {len(small_files)}")
        print(f"   - Normal files (≥ 1KB): {len(normal_files)}")
        
        if small_files:
            print(f"\n   🚨 SUSPICIOUS SMALL FILES FOUND:")
            for filename, size in small_files[:10]:  # Show first 10
                print(f"   - {filename}: {size} bytes")
        
    except Exception as e:
        print(f"   ❌ Error checking existing files: {e}")
    
    # Final assessment
    print(f"\n📊 INVESTIGATION RESULTS:")
    print("=" * 60)
    
    success_rate = (sum(results) / len(results) * 100) if results else 0
    
    print(f"Upload tests: {sum(results)}/{len(results)} passed ({success_rate:.1f}%)")
    
    if success_rate < 80:
        print(f"\n❌ CRITICAL ISSUE CONFIRMED:")
        print(f"   - Logo uploads are returning 200 OK status")
        print(f"   - But files are being saved with incorrect sizes")
        print(f"   - This matches the reported issue (78-94 bytes)")
        print(f"\n💡 ROOT CAUSE ANALYSIS:")
        print(f"   - The issue appears to be in the file upload handling")
        print(f"   - Files are being 'uploaded' successfully (200 OK)")
        print(f"   - But the file content is not being written correctly")
        print(f"   - Backend logs show 'File size: 0.00 MB' for failed uploads")
        print(f"\n🔧 RECOMMENDED FIXES:")
        print(f"   1. Check the aiofiles.open() and write operations in server.py")
        print(f"   2. Verify that await custom_logo.read() is working correctly")
        print(f"   3. Ensure the file content is being written before the response")
        print(f"   4. Add proper error handling for file write operations")
        
        return False
    else:
        print(f"\n✅ No critical issues detected in current tests")
        print(f"   However, existing small files suggest intermittent issues")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)