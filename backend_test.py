#!/usr/bin/env python3
"""
Backend Testing Suite for Menu Maestro
Tests all backend APIs following the recommended flow from test_result.md
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://menu-maestro-45.preview.emergentagent.com/api"
TIMEOUT_NORMAL = 30
TIMEOUT_IMAGE_GEN = 90  # Extended timeout for image generation

class MenuMaestroTester:
    def __init__(self):
        self.token = None
        self.user_data = None
        self.test_results = {}
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test results"""
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def test_auth_register(self):
        """Test user registration"""
        test_name = "Autenticación - Registro"
        
        # Generate unique test data
        unique_id = str(uuid.uuid4())[:8]
        test_user = {
            "email": f"test.user.{unique_id}@menumaestro.com",
            "password": "TestPassword123!",
            "name": f"Usuario Test {unique_id}"
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/register",
                json=test_user,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.user_data = data["user"]
                    self.log_result(test_name, True, f"Usuario registrado exitosamente: {data['user']['email']}", data)
                    return True
                else:
                    self.log_result(test_name, False, "Respuesta sin token o datos de usuario")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_auth_login(self):
        """Test user login with existing credentials"""
        test_name = "Autenticación - Login"
        
        if not self.user_data:
            self.log_result(test_name, False, "No hay datos de usuario para login")
            return False
            
        login_data = {
            "email": self.user_data["email"],
            "password": "TestPassword123!"
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=login_data,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    # Update token from login
                    self.token = data["token"]
                    self.log_result(test_name, True, "Login exitoso, token actualizado", data)
                    return True
                else:
                    self.log_result(test_name, False, "Login sin token en respuesta")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_profile_get_empty(self):
        """Test getting profile when not configured"""
        test_name = "Perfil - Obtener (vacío)"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(
                f"{BASE_URL}/profile",
                headers=headers,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                if "configured" in data and data["configured"] == False:
                    self.log_result(test_name, True, "Perfil vacío detectado correctamente", data)
                    return True
                else:
                    self.log_result(test_name, True, "Perfil ya configurado", data)
                    return True
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_profile_create(self):
        """Test creating/updating user profile"""
        test_name = "Perfil - Crear/Actualizar"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        profile_data = {
            "edad": 28,
            "peso": 70.5,
            "altura": 175.0,
            "genero": "masculino",
            "tipo_cuerpo": "mesomorfo",
            "nivel_actividad": "moderado",
            "objetivo": "mantener",
            "alergias": ["nueces", "mariscos"],
            "enfermedades": ["diabetes"],
            "preferencias_alimenticias": ["sin_gluten", "bajo_sodio"]
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.post(
                f"{BASE_URL}/profile",
                json=profile_data,
                headers=headers,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "profile" in data:
                    self.log_result(test_name, True, "Perfil creado/actualizado exitosamente", data)
                    return True
                else:
                    self.log_result(test_name, False, "Respuesta inesperada del servidor")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_profile_get_configured(self):
        """Test getting configured profile"""
        test_name = "Perfil - Obtener (configurado)"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(
                f"{BASE_URL}/profile",
                headers=headers,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["edad", "peso", "altura", "genero", "tipo_cuerpo", "nivel_actividad", "objetivo"]
                
                if all(field in data for field in required_fields):
                    self.log_result(test_name, True, "Perfil configurado obtenido correctamente", data)
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result(test_name, False, f"Campos faltantes en perfil: {missing}")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_stats(self):
        """Test getting user statistics"""
        test_name = "Estadísticas del usuario"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(
                f"{BASE_URL}/stats",
                headers=headers,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["configured", "calorias_objetivo", "calorias_hoy", "comidas_hoy", "total_recetas_generadas", "progreso_hoy"]
                
                if data.get("configured") == True and all(field in data for field in expected_fields):
                    self.log_result(test_name, True, f"Estadísticas obtenidas: {data['calorias_objetivo']} kcal objetivo", data)
                    return True
                else:
                    self.log_result(test_name, False, f"Datos de estadísticas incompletos: {data}")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_generate_meal_with_image(self):
        """Test meal generation with AI image (CRITICAL - can take 30-60 seconds)"""
        test_name = "Generación de receta con imagen IA"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        meal_request = {
            "tipo_comida": "almuerzo",
            "ingredientes_deseados": ["pollo", "arroz", "verduras"],
            "ingredientes_excluir": ["nueces", "mariscos"]
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        print(f"⏳ Generando receta con imagen... (puede tomar hasta 60 segundos)")
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{BASE_URL}/generate-meal",
                json=meal_request,
                headers=headers,
                timeout=TIMEOUT_IMAGE_GEN
            )
            
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "nombre", "ingredientes", "preparacion", "calorias", "proteinas", "carbohidratos", "grasas"]
                
                if all(field in data for field in required_fields):
                    has_image = "imagen_base64" in data and data["imagen_base64"] is not None
                    image_status = "con imagen" if has_image else "sin imagen"
                    
                    self.log_result(test_name, True, 
                        f"Receta generada exitosamente {image_status} en {elapsed_time:.1f}s: {data['nombre']} ({data['calorias']} kcal)", 
                        {k: v for k, v in data.items() if k != "imagen_base64"}  # Exclude base64 from log
                    )
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result(test_name, False, f"Campos faltantes en receta: {missing}")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            self.log_result(test_name, False, f"Timeout después de {TIMEOUT_IMAGE_GEN}s - La generación de imagen puede estar tardando más de lo esperado")
            return False
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_daily_suggestions(self):
        """Test daily meal suggestions"""
        test_name = "Sugerencias diarias"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(
                f"{BASE_URL}/daily-suggestions",
                headers=headers,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "sugerencias" in data and "calorias_objetivo" in data and "fecha" in data:
                    sugerencias = data["sugerencias"]
                    if len(sugerencias) == 3:
                        tipos_esperados = {"desayuno", "almuerzo", "cena"}
                        tipos_recibidos = {s["tipo_comida"] for s in sugerencias}
                        
                        if tipos_esperados == tipos_recibidos:
                            self.log_result(test_name, True, 
                                f"Sugerencias diarias generadas correctamente para {data['calorias_objetivo']} kcal", 
                                data
                            )
                            return True
                        else:
                            self.log_result(test_name, False, f"Tipos de comida incorrectos: {tipos_recibidos}")
                            return False
                    else:
                        self.log_result(test_name, False, f"Se esperaban 3 sugerencias, recibidas: {len(sugerencias)}")
                        return False
                else:
                    self.log_result(test_name, False, "Estructura de respuesta incorrecta")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_meal_history(self):
        """Test meal history retrieval"""
        test_name = "Historial de comidas"
        
        if not self.token:
            self.log_result(test_name, False, "No hay token de autenticación")
            return False
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(
                f"{BASE_URL}/meal-history",
                headers=headers,
                timeout=TIMEOUT_NORMAL
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check first meal structure
                        meal = data[0]
                        required_fields = ["id", "user_id", "tipo_comida", "nombre", "ingredientes", "preparacion", "calorias"]
                        
                        if all(field in meal for field in required_fields):
                            self.log_result(test_name, True, 
                                f"Historial obtenido correctamente: {len(data)} comidas", 
                                {"total_meals": len(data), "sample_meal": meal["nombre"]}
                            )
                            return True
                        else:
                            missing = [f for f in required_fields if f not in meal]
                            self.log_result(test_name, False, f"Estructura de comida incorrecta, campos faltantes: {missing}")
                            return False
                    else:
                        self.log_result(test_name, True, "Historial vacío (esperado para usuario nuevo)", data)
                        return True
                else:
                    self.log_result(test_name, False, "Respuesta no es una lista")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def test_api_root(self):
        """Test API root endpoint"""
        test_name = "API Root"
        
        try:
            response = requests.get(f"{BASE_URL}/", timeout=TIMEOUT_NORMAL)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result(test_name, True, f"API disponible: {data['message']}", data)
                    return True
                else:
                    self.log_result(test_name, False, "Respuesta sin mensaje")
                    return False
            else:
                self.log_result(test_name, False, f"Error HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(test_name, False, f"Error de conexión: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in the recommended order"""
        print("=" * 80)
        print("MENU MAESTRO - BACKEND API TESTING")
        print("=" * 80)
        print(f"Backend URL: {BASE_URL}")
        print(f"Timeout normal: {TIMEOUT_NORMAL}s")
        print(f"Timeout generación imagen: {TIMEOUT_IMAGE_GEN}s")
        print("=" * 80)
        
        # Test sequence following the recommended flow
        tests = [
            ("API Root", self.test_api_root),
            ("Registro", self.test_auth_register),
            ("Login", self.test_auth_login),
            ("Perfil vacío", self.test_profile_get_empty),
            ("Crear perfil", self.test_profile_create),
            ("Perfil configurado", self.test_profile_get_configured),
            ("Estadísticas", self.test_stats),
            ("Generación receta + imagen", self.test_generate_meal_with_image),
            ("Sugerencias diarias", self.test_daily_suggestions),
            ("Historial comidas", self.test_meal_history),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_desc, test_func in tests:
            print(f"\n🧪 Ejecutando: {test_desc}")
            if test_func():
                passed += 1
            time.sleep(1)  # Small delay between tests
        
        print("\n" + "=" * 80)
        print("RESUMEN DE TESTING")
        print("=" * 80)
        print(f"Tests ejecutados: {total}")
        print(f"Tests exitosos: {passed}")
        print(f"Tests fallidos: {total - passed}")
        print(f"Tasa de éxito: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [name for name, result in self.test_results.items() if not result["success"]]
        if failed_tests:
            print(f"\n❌ Tests fallidos:")
            for test in failed_tests:
                print(f"  - {test}: {self.test_results[test]['message']}")
        
        print("=" * 80)
        
        return passed == total

if __name__ == "__main__":
    tester = MenuMaestroTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 Todos los tests pasaron exitosamente!")
        exit(0)
    else:
        print("⚠️  Algunos tests fallaron. Revisar logs arriba.")
        exit(1)