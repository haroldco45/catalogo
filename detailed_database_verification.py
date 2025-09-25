#!/usr/bin/env python3
"""
Detailed Database Verification Script
Specifically requested to verify database state and understand discrepancies
"""

import requests
import json
from datetime import datetime

class DatabaseVerifier:
    def __init__(self, base_url="https://panel-logo-editor.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"

    def get_recent_links_details(self):
        """Get the most recent 5 links and their details"""
        print("🔍 GETTING MOST RECENT 5 LINKS")
        print("-" * 50)
        
        try:
            response = requests.get(f"{self.api_url}/links/manage", timeout=10)
            if response.status_code == 200:
                all_links = response.json()
                # Sort by created_at descending (most recent first)
                sorted_links = sorted(all_links, key=lambda x: x.get('created_at', ''), reverse=True)
                recent_5 = sorted_links[:5]
                
                print(f"📊 MOST RECENT 5 LINKS:")
                for i, link in enumerate(recent_5, 1):
                    created_at = link.get('created_at', 'Unknown')
                    if created_at != 'Unknown':
                        try:
                            # Parse and format the date
                            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                            formatted_date = dt.strftime('%Y-%m-%d %H:%M:%S UTC')
                        except:
                            formatted_date = created_at
                    else:
                        formatted_date = 'Unknown'
                    
                    print(f"  {i}. {link.get('owner_name', 'Unknown')} - {link.get('website_url', 'Unknown')}")
                    print(f"     Status: {link.get('status', 'Unknown')} | Created: {formatted_date}")
                    print(f"     Location: {link.get('location', 'Unknown')} | Phone: {link.get('phone', 'Unknown')}")
                    print()
                
                return recent_5
            else:
                print(f"❌ Failed to get links: Status {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Error getting recent links: {e}")
            return []

    def verify_database_counts(self):
        """Verify exact database counts and status distribution"""
        print("🔍 COMPLETE DATABASE VERIFICATION")
        print("-" * 50)
        
        # Get admin dashboard data (most comprehensive)
        try:
            response = requests.get(f"{self.api_url}/admin/dashboard", timeout=10)
            if response.status_code == 200:
                data = response.json()
                links = data.get('links', [])
                stats = data.get('stats', {})
                
                print(f"📊 REAL DATABASE STATE:")
                print(f"   Total Links in Database: {len(links)}")
                print(f"   Approved Links: {stats.get('approved', 0)}")
                print(f"   Pending Links: {stats.get('pending', 0)}")
                print(f"   Rejected Links: {stats.get('rejected', 0)}")
                print(f"   Estimated Revenue: ${stats.get('estimated_revenue', 0)}")
                print()
                
                # Verify counts by manually counting
                approved_count = len([l for l in links if l.get('status') == 'approved'])
                pending_count = len([l for l in links if l.get('status') == 'pending'])
                rejected_count = len([l for l in links if l.get('status') == 'rejected'])
                
                print(f"📊 MANUAL COUNT VERIFICATION:")
                print(f"   Approved (manual count): {approved_count}")
                print(f"   Pending (manual count): {pending_count}")
                print(f"   Rejected (manual count): {rejected_count}")
                print(f"   Total (manual count): {approved_count + pending_count + rejected_count}")
                print()
                
                # Check consistency
                stats_total = stats.get('total_submissions', 0)
                manual_total = approved_count + pending_count + rejected_count
                
                if stats_total == manual_total == len(links):
                    print("✅ DATABASE CONSISTENCY: All counts match perfectly")
                else:
                    print("❌ DATABASE INCONSISTENCY DETECTED:")
                    print(f"   Stats total: {stats_total}")
                    print(f"   Manual total: {manual_total}")
                    print(f"   Links array length: {len(links)}")
                
                return {
                    'total': len(links),
                    'approved': approved_count,
                    'pending': pending_count,
                    'rejected': rejected_count,
                    'consistent': stats_total == manual_total == len(links)
                }
            else:
                print(f"❌ Failed to get admin dashboard: Status {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error verifying database: {e}")
            return None

    def test_endpoint_responses(self):
        """Test all requested endpoints and compare responses"""
        print("🔍 ENDPOINT RESPONSE COMPARISON")
        print("-" * 50)
        
        endpoints = [
            ("/api/links", "Main page links (approved only)"),
            ("/api/admin/dashboard", "Admin dashboard (all links + stats)"),
            ("/api/links/manage", "Management view (all links)"),
            ("/api/links?status=pending", "Pending links only"),
            ("/api/links?status=approved", "Approved links only")
        ]
        
        results = {}
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    
                    if endpoint == "/api/admin/dashboard":
                        count = len(data.get('links', []))
                        extra_info = f" | Stats: {data.get('stats', {})}"
                    else:
                        count = len(data) if isinstance(data, list) else 0
                        extra_info = ""
                    
                    print(f"✅ {description}: {count} links{extra_info}")
                    results[endpoint] = {'count': count, 'data': data, 'success': True}
                else:
                    print(f"❌ {description}: Status {response.status_code}")
                    results[endpoint] = {'count': 0, 'success': False, 'status': response.status_code}
            except Exception as e:
                print(f"❌ {description}: Error - {e}")
                results[endpoint] = {'count': 0, 'success': False, 'error': str(e)}
        
        return results

    def analyze_discrepancy(self):
        """Analyze the reported discrepancy between shown and sent links"""
        print("🔍 DISCREPANCY ANALYSIS")
        print("-" * 50)
        
        # Get the data
        db_verification = self.verify_database_counts()
        endpoint_results = self.test_endpoint_responses()
        
        if db_verification and endpoint_results:
            main_page_count = endpoint_results.get('/api/links', {}).get('count', 0)
            total_db_count = db_verification['total']
            pending_count = db_verification['pending']
            
            print(f"📊 DISCREPANCY ANALYSIS RESULTS:")
            print(f"   Main page shows: {main_page_count} links (approved only)")
            print(f"   Total in database: {total_db_count} links")
            print(f"   Pending approval: {pending_count} links")
            print(f"   Hidden from main page: {total_db_count - main_page_count} links")
            print()
            
            if pending_count > 0:
                print(f"🎯 EXPLANATION OF DISCREPANCY:")
                print(f"   The main page only shows APPROVED links ({main_page_count})")
                print(f"   There are {pending_count} links waiting for admin approval")
                print(f"   These pending links are NOT shown on the main page")
                print(f"   Total submissions received: {total_db_count}")
                print()
                
                print(f"🔧 ADMIN ACTION NEEDED:")
                print(f"   {pending_count} links need to be reviewed and approved")
                print(f"   Use admin panel to approve/reject pending submissions")
            else:
                print(f"✅ NO PENDING LINKS: All submissions have been processed")

    def run_complete_verification(self):
        """Run complete database verification as requested"""
        print("🚀 COMPLETE DATABASE STATE VERIFICATION")
        print("=" * 60)
        print("Requested by: User reporting discrepancy between shown and sent links")
        print("=" * 60)
        
        # 1. Verify total counts and status distribution
        db_verification = self.verify_database_counts()
        
        # 2. Get most recent 5 links
        recent_links = self.get_recent_links_details()
        
        # 3. Test all requested endpoints
        endpoint_results = self.test_endpoint_responses()
        
        # 4. Analyze the discrepancy
        self.analyze_discrepancy()
        
        print("=" * 60)
        print("🎯 VERIFICATION COMPLETE")
        print("=" * 60)

def main():
    verifier = DatabaseVerifier()
    verifier.run_complete_verification()

if __name__ == "__main__":
    main()