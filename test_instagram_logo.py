#!/usr/bin/env python3
import requests
import json
from io import BytesIO

def test_instagram_logo_upload():
    """Test logo upload specifically for Instagram links"""
    api_url = 'https://logo-fix-hub.preview.emergentagent.com/api'
    
    # Create test image
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00d\x00\x00\x00d\x08\x02\x00\x00\x00\xff\x80\x02\x03\x19tEXtSoftwareAdobe ImageReadyq\xc9e<\x00\x00\x00\x0eIDATx\xdac\xf8\x0f\x01\x01\x00\x18\xdd\x8d\xb4IEND\xaeB`\x82'
    test_image = BytesIO(png_data)
    
    # Submit Instagram link
    form_data = {
        'owner_name': 'Instagram Business Account',
        'phone': '3001234567',
        'location': 'Medellín, Colombia',
        'website_url': 'https://www.instagram.com/business_account_test'
    }
    
    files = {'payment_screenshot': ('payment.png', test_image, 'image/png')}
    
    print('📱 Creating Instagram business link...')
    response = requests.post(f'{api_url}/links/submit', data=form_data, files=files, timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        link_id = data.get('id')
        print(f'✅ Instagram link created: {link_id}')
        
        # Approve the link
        print('📝 Approving Instagram link...')
        update_data = {'status': 'approved'}
        response = requests.put(f'{api_url}/links/{link_id}', json=update_data, timeout=10)
        
        if response.status_code == 200:
            print('✅ Instagram link approved')
            
            # Test logo upload
            print('🖼️  Testing logo upload for Instagram link...')
            test_logo = BytesIO(png_data)
            files = {'custom_logo': ('instagram_logo.png', test_logo, 'image/png')}
            
            response = requests.put(f'{api_url}/links/{link_id}/logo', files=files, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                print(f'✅ Logo upload successful: {result.get("message", "")}')
                
                # Test logo removal
                print('🗑️  Testing logo removal...')
                data = {'remove_logo': True}
                response = requests.put(f'{api_url}/links/{link_id}/logo', data=data, timeout=15)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f'✅ Logo removal successful: {result.get("message", "")}')
                    
                    # Test logo upload again
                    print('🖼️  Testing logo re-upload...')
                    test_logo2 = BytesIO(png_data)
                    files = {'custom_logo': ('instagram_logo2.png', test_logo2, 'image/png')}
                    
                    response = requests.put(f'{api_url}/links/{link_id}/logo', files=files, timeout=15)
                    
                    if response.status_code == 200:
                        result = response.json()
                        print(f'✅ Logo re-upload successful: {result.get("message", "")}')
                        print(f'\n🎉 ALL INSTAGRAM LOGO TESTS PASSED!')
                        return True
                    else:
                        print(f'❌ Logo re-upload failed: {response.status_code}')
                        return False
                else:
                    print(f'❌ Logo removal failed: {response.status_code}')
                    return False
            else:
                print(f'❌ Logo upload failed: {response.status_code}')
                try:
                    error = response.json()
                    print(f'   Error: {error.get("detail", "Unknown error")}')
                except:
                    print(f'   Response: {response.text[:100]}')
                return False
        else:
            print(f'❌ Failed to approve Instagram link: {response.status_code}')
            return False
    else:
        print(f'❌ Failed to create Instagram link: {response.status_code}')
        try:
            error = response.json()
            print(f'   Error: {error.get("detail", "Unknown error")}')
        except:
            print(f'   Response: {response.text[:100]}')
        return False

if __name__ == "__main__":
    print("🧪 INSTAGRAM LOGO UPLOAD SPECIFIC TEST")
    print("=" * 50)
    success = test_instagram_logo_upload()
    if success:
        print("\n✅ Instagram logo upload functionality is working correctly!")
    else:
        print("\n❌ Instagram logo upload functionality has issues!")