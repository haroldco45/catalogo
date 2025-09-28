#!/usr/bin/env python3
"""
Comprehensive Backend Testing for LinkHub API
Tests all backend endpoints with various scenarios including edge cases
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        pass
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_BASE = f"{BASE_URL}/api"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def log_pass(self, test_name):
        print(f"✅ PASS: {test_name}")
        self.passed += 1
        
    def log_fail(self, test_name, error):
        print(f"❌ FAIL: {test_name} - {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed/total*100):.1f}%" if total > 0 else "No tests run")
        
        if self.errors:
            print(f"\n{'='*60}")
            print("FAILED TESTS:")
            print(f"{'='*60}")
            for error in self.errors:
                print(f"• {error}")
        
        return self.failed == 0

def test_api_health():
    """Test basic API connectivity"""
    results = TestResults()
    
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            results.log_pass("API Health Check")
        else:
            results.log_fail("API Health Check", f"Status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("API Health Check", f"Connection error: {str(e)}")
    
    return results

def test_company_registration():
    """Test Company Registration API with various scenarios"""
    results = TestResults()
    
    # Test 1: Valid company registration
    valid_company = {
        "name": "TechCorp Solutions",
        "website": "https://techcorp.com",
        "email": "contact@techcorp.com",
        "phone": "+57 300 123 4567",
        "category": "Tecnología",
        "instagram": "techcorp_official",
        "description": "Empresa líder en soluciones tecnológicas innovadoras"
    }
    
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               json=valid_company, 
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("registration_id"):
                results.log_pass("Valid Company Registration")
            else:
                results.log_fail("Valid Company Registration", f"Invalid response structure: {data}")
        else:
            results.log_fail("Valid Company Registration", f"Status: {response.status_code}, Response: {response.text}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Valid Company Registration", f"Request error: {str(e)}")
    
    # Test 2: Duplicate company registration (should fail)
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               json=valid_company, 
                               timeout=10)
        if response.status_code == 400:
            results.log_pass("Duplicate Company Prevention")
        else:
            results.log_fail("Duplicate Company Prevention", f"Expected 400, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Duplicate Company Prevention", f"Request error: {str(e)}")
    
    # Test 3: Missing required fields
    invalid_company = {
        "name": "Incomplete Corp",
        # Missing website and email
        "category": "Test"
    }
    
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               json=invalid_company, 
                               timeout=10)
        if response.status_code == 422:  # Validation error
            results.log_pass("Missing Required Fields Validation")
        else:
            results.log_fail("Missing Required Fields Validation", f"Expected 422, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Missing Required Fields Validation", f"Request error: {str(e)}")
    
    # Test 4: Invalid email format
    invalid_email_company = {
        "name": "Bad Email Corp",
        "website": "https://bademail.com",
        "email": "not-an-email",
        "category": "Test"
    }
    
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               json=invalid_email_company, 
                               timeout=10)
        if response.status_code == 422:
            results.log_pass("Invalid Email Format Validation")
        else:
            results.log_fail("Invalid Email Format Validation", f"Expected 422, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Invalid Email Format Validation", f"Request error: {str(e)}")
    
    # Test 5: Register another valid company for listing tests
    another_company = {
        "name": "Green Energy Solutions",
        "website": "https://greenenergy.co",
        "email": "info@greenenergy.co",
        "phone": "+57 301 987 6543",
        "category": "Energía Renovable",
        "instagram": "green_energy_co",
        "description": "Soluciones sostenibles en energía renovable"
    }
    
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               json=another_company, 
                               timeout=10)
        if response.status_code == 200:
            results.log_pass("Second Company Registration")
        else:
            results.log_fail("Second Company Registration", f"Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Second Company Registration", f"Request error: {str(e)}")
    
    return results

def test_companies_listing():
    """Test Companies Listing API"""
    results = TestResults()
    
    # Test 1: Get verified companies only (default)
    try:
        response = requests.get(f"{API_BASE}/companies", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "companies" in data and "total" in data:
                results.log_pass("Get Verified Companies (Default)")
            else:
                results.log_fail("Get Verified Companies (Default)", f"Invalid response structure: {data}")
        else:
            results.log_fail("Get Verified Companies (Default)", f"Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Get Verified Companies (Default)", f"Request error: {str(e)}")
    
    # Test 2: Get all companies (verified_only=false)
    try:
        response = requests.get(f"{API_BASE}/companies?verified_only=false", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "companies" in data and "total" in data:
                results.log_pass("Get All Companies")
                # Should have at least the companies we registered
                if data["total"] >= 2:
                    results.log_pass("Companies Count Validation")
                else:
                    results.log_fail("Companies Count Validation", f"Expected at least 2 companies, got {data['total']}")
            else:
                results.log_fail("Get All Companies", f"Invalid response structure: {data}")
        else:
            results.log_fail("Get All Companies", f"Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Get All Companies", f"Request error: {str(e)}")
    
    # Test 3: Test with limit parameter
    try:
        response = requests.get(f"{API_BASE}/companies?limit=1&verified_only=false", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if len(data.get("companies", [])) <= 1:
                results.log_pass("Companies Limit Parameter")
            else:
                results.log_fail("Companies Limit Parameter", f"Expected max 1 company, got {len(data.get('companies', []))}")
        else:
            results.log_fail("Companies Limit Parameter", f"Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Companies Limit Parameter", f"Request error: {str(e)}")
    
    return results

def test_stats_api():
    """Test Statistics API"""
    results = TestResults()
    
    try:
        response = requests.get(f"{API_BASE}/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_companies", "monthly_visitors", "avg_traffic_increase", "customer_satisfaction"]
            
            if all(field in data for field in required_fields):
                results.log_pass("Stats API Structure")
                
                # Validate data types
                if (isinstance(data["total_companies"], int) and 
                    isinstance(data["monthly_visitors"], int) and
                    isinstance(data["avg_traffic_increase"], int) and
                    isinstance(data["customer_satisfaction"], (int, float))):
                    results.log_pass("Stats Data Types")
                else:
                    results.log_fail("Stats Data Types", f"Invalid data types in response: {data}")
                
                # Validate reasonable values
                if (data["total_companies"] >= 0 and 
                    data["monthly_visitors"] >= 0 and
                    0 <= data["customer_satisfaction"] <= 5):
                    results.log_pass("Stats Value Ranges")
                else:
                    results.log_fail("Stats Value Ranges", f"Values out of expected range: {data}")
            else:
                results.log_fail("Stats API Structure", f"Missing required fields. Got: {data}")
        else:
            results.log_fail("Stats API", f"Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Stats API", f"Request error: {str(e)}")
    
    return results

def test_contact_api():
    """Test Contact API"""
    results = TestResults()
    
    # Test 1: Valid contact submission
    valid_contact = {
        "name": "María González",
        "email": "maria@example.com",
        "message": "Estoy interesada en registrar mi empresa de diseño gráfico. ¿Podrían enviarme más información sobre el proceso?",
        "type": "question"
    }
    
    try:
        response = requests.post(f"{API_BASE}/contact", 
                               json=valid_contact, 
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("message"):
                results.log_pass("Valid Contact Submission")
            else:
                results.log_fail("Valid Contact Submission", f"Invalid response structure: {data}")
        else:
            results.log_fail("Valid Contact Submission", f"Status: {response.status_code}, Response: {response.text}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Valid Contact Submission", f"Request error: {str(e)}")
    
    # Test 2: Missing required fields
    invalid_contact = {
        "name": "Test User",
        # Missing email and message
        "type": "support"
    }
    
    try:
        response = requests.post(f"{API_BASE}/contact", 
                               json=invalid_contact, 
                               timeout=10)
        if response.status_code == 422:
            results.log_pass("Contact Missing Fields Validation")
        else:
            results.log_fail("Contact Missing Fields Validation", f"Expected 422, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Contact Missing Fields Validation", f"Request error: {str(e)}")
    
    # Test 3: Invalid email format
    invalid_email_contact = {
        "name": "Test User",
        "email": "invalid-email",
        "message": "This is a test message with invalid email format",
        "type": "support"
    }
    
    try:
        response = requests.post(f"{API_BASE}/contact", 
                               json=invalid_email_contact, 
                               timeout=10)
        if response.status_code == 422:
            results.log_pass("Contact Invalid Email Validation")
        else:
            results.log_fail("Contact Invalid Email Validation", f"Expected 422, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Contact Invalid Email Validation", f"Request error: {str(e)}")
    
    # Test 4: Test different contact types
    for contact_type in ["support", "question", "partnership"]:
        contact_data = {
            "name": f"Test User {contact_type.title()}",
            "email": f"test_{contact_type}@example.com",
            "message": f"This is a {contact_type} message for testing purposes.",
            "type": contact_type
        }
        
        try:
            response = requests.post(f"{API_BASE}/contact", 
                                   json=contact_data, 
                                   timeout=10)
            if response.status_code == 200:
                results.log_pass(f"Contact Type: {contact_type}")
            else:
                results.log_fail(f"Contact Type: {contact_type}", f"Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            results.log_fail(f"Contact Type: {contact_type}", f"Request error: {str(e)}")
    
    return results

def test_edge_cases():
    """Test various edge cases and error conditions"""
    results = TestResults()
    
    # Test 1: Invalid endpoint
    try:
        response = requests.get(f"{API_BASE}/nonexistent", timeout=10)
        if response.status_code == 404:
            results.log_pass("Invalid Endpoint Handling")
        else:
            results.log_fail("Invalid Endpoint Handling", f"Expected 404, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Invalid Endpoint Handling", f"Request error: {str(e)}")
    
    # Test 2: Malformed JSON
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               data="invalid json", 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        if response.status_code == 422:
            results.log_pass("Malformed JSON Handling")
        else:
            results.log_fail("Malformed JSON Handling", f"Expected 422, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Malformed JSON Handling", f"Request error: {str(e)}")
    
    # Test 3: Very long strings (should be rejected)
    long_string_company = {
        "name": "A" * 200,  # Exceeds max_length=100
        "website": "https://example.com",
        "email": "test@example.com",
        "category": "Test"
    }
    
    try:
        response = requests.post(f"{API_BASE}/companies/register", 
                               json=long_string_company, 
                               timeout=10)
        if response.status_code == 422:
            results.log_pass("Long String Validation")
        else:
            results.log_fail("Long String Validation", f"Expected 422, got {response.status_code}")
    except requests.exceptions.RequestException as e:
        results.log_fail("Long String Validation", f"Request error: {str(e)}")
    
    return results

def main():
    print("🚀 Starting LinkHub Backend API Tests")
    print(f"Testing against: {BASE_URL}")
    print("="*60)
    
    all_results = TestResults()
    
    # Run all test suites
    test_suites = [
        ("API Health", test_api_health),
        ("Company Registration", test_company_registration),
        ("Companies Listing", test_companies_listing),
        ("Statistics API", test_stats_api),
        ("Contact API", test_contact_api),
        ("Edge Cases", test_edge_cases)
    ]
    
    for suite_name, test_func in test_suites:
        print(f"\n📋 Running {suite_name} Tests...")
        print("-" * 40)
        
        suite_results = test_func()
        
        # Aggregate results
        all_results.passed += suite_results.passed
        all_results.failed += suite_results.failed
        all_results.errors.extend(suite_results.errors)
        
        print(f"Suite Results: {suite_results.passed} passed, {suite_results.failed} failed")
    
    # Final summary
    success = all_results.summary()
    
    if success:
        print(f"\n🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"\n⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())