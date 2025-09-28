import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Star, Users, DollarSign, Zap, Instagram, Globe, TrendingUp, CheckCircle, ArrowRight, Eye, Clock, Smartphone, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LandingPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [stats, setStats] = useState({
    total_companies: 60,
    monthly_visitors: 25000,
    avg_traffic_increase: 340,
    customer_satisfaction: 4.9
  });
  const [registrationForm, setRegistrationForm] = useState({
    companyName: '',
    website: '',
    email: '',
    phone: '',
    category: '',
    instagram: '',
    description: ''
  });

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Mantener stats por defecto si hay error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async () => {
    // Validaciones básicas
    if (!registrationForm.companyName || !registrationForm.website || !registrationForm.email) {
      alert('Por favor completa los campos obligatorios: Nombre de empresa, sitio web y email.');
      return;
    }

    setIsRegistering(true);
    
    try {
      const response = await axios.post(`${API}/companies/register`, {
        name: registrationForm.companyName,
        website: registrationForm.website,
        email: registrationForm.email,
        phone: registrationForm.phone,
        category: registrationForm.category || 'General',
        instagram: registrationForm.instagram,
        description: registrationForm.description
      });
      
      if (response.data.success) {
        alert(response.data.message);
        // Limpiar formulario
        setRegistrationForm({
          companyName: '',
          website: '',
          email: '',
          phone: '',
          category: '',
          instagram: '',
          description: ''
        });
        // Actualizar estadísticas
        fetchStats();
      }
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Error al procesar el registro. ';
      
      if (error.response?.data?.detail) {
        errorMessage += error.response.data.detail;
      } else {
        errorMessage += 'Por favor intenta nuevamente.';
      }
      
      alert(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const testimonials = [
    {
      name: "Distrileco",
      business: "Empresa de distribución",
      rating: 5,
      comment: "Increíble ROI. Por solo $1 USD hemos tenido más visibilidad que con publicidad tradicional.",
      avatar: "D"
    },
    {
      name: "Café Sello Rojo",
      business: "Marca de café",
      rating: 5,
      comment: "Nuestro tráfico web aumentó 300% desde que aparecemos en LinkHub. ¡Mejor inversión!",
      avatar: "C"
    },
    {
      name: "Berhlan",
      business: "Empresa tecnológica",
      rating: 5,
      comment: "La exposición permanente vale oro. Seguimos recibiendo clientes meses después.",
      avatar: "B"
    }
  ];

  const features = [
    {
      icon: <DollarSign className="h-12 w-12" />,
      title: "Solo $1 USD",
      description: "Pago único. Sin mensualidades ni sorpresas. La publicidad más económica que existe."
    },
    {
      icon: <Clock className="h-12 w-12" />,
      title: "Exposición Permanente",
      description: "Tu empresa visible 24/7 para miles de personas. Una inversión que dura para siempre."
    },
    {
      icon: <Users className="h-12 w-12" />,
      title: `${stats.total_companies}+ Empresas`,
      description: `Únete a las ${stats.total_companies}+ empresas que ya están generando tráfico desde nuestra plataforma.`
    },
    {
      icon: <Smartphone className="h-12 w-12" />,
      title: "Perfecto para Instagram",
      description: "Ideal para usuarios de Instagram que quieren promocionar su negocio o perfil."
    }
  ];

  const faqs = [
    {
      question: "¿Realmente es solo $1 USD?",
      answer: "Sí, es un pago único de $1 USD equivalente en pesos colombianos a través de Nequi. Sin mensualidades, sin costos ocultos."
    },
    {
      question: "¿Cómo funciona el proceso?",
      answer: "Envías tu información, realizas el pago de $1 USD por Nequi al número 3117700431, y en 24 horas tu empresa aparece en nuestro directorio."
    },
    {
      question: "¿Puedo agregar mi perfil de Instagram?",
      answer: "¡Por supuesto! Muchos de nuestros usuarios son instagramers que quieren más visibilidad para su negocio o marca personal."
    },
    {
      question: "¿Qué pasa si quiero hacer cambios después?",
      answer: "Los cambios menores son gratuitos. Solo contacta nuestro soporte y actualizamos tu información."
    },
    {
      question: "¿Cuántas visitas puedo esperar?",
      answer: "Nuestros usuarios reportan aumentos de tráfico entre 200-500%. El ROI es excepcional para la inversión de $1 USD."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Globe className="h-8 w-8 text-emerald-600" />
              <span className="text-2xl font-bold text-gray-900">LinkHub</span>
            </div>
            <Button onClick={handleRegister} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
              Unirse Ahora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-2">
                {stats.total_companies}+ Empresas Confían en Nosotros
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Tu Empresa Visible
                <span className="block text-yellow-300">por Solo $1 USD</span>
              </h1>
              <p className="text-xl lg:text-2xl text-emerald-100 leading-relaxed">
                Únete al directorio web más efectivo de Colombia. Pago único, exposición permanente, 
                resultados garantizados.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Dialog open={showRegistrationModal} onOpenChange={setShowRegistrationModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-4 text-lg rounded-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                      Registrar Mi Empresa
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-gray-900">
                        Registra tu Empresa
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          value={registrationForm.companyName}
                          onChange={handleInputChange}
                          placeholder="Ej: Mi Empresa SAS"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="website">Sitio Web *</Label>
                        <Input
                          id="website"
                          name="website"
                          value={registrationForm.website}
                          onChange={handleInputChange}
                          placeholder="https://miempresa.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email de Contacto *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={registrationForm.email}
                          onChange={handleInputChange}
                          placeholder="contacto@miempresa.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={registrationForm.phone}
                          onChange={handleInputChange}
                          placeholder="300 123 4567"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Categoría</Label>
                        <Select name="category" value={registrationForm.category} onValueChange={(value) => setRegistrationForm(prev => ({...prev, category: value}))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Retail">Retail</SelectItem>
                            <SelectItem value="Alimentos">Alimentos</SelectItem>
                            <SelectItem value="Tecnología">Tecnología</SelectItem>
                            <SelectItem value="Servicios">Servicios</SelectItem>
                            <SelectItem value="Salud">Salud</SelectItem>
                            <SelectItem value="Entretenimiento">Entretenimiento</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="instagram">Instagram (opcional)</Label>
                        <Input
                          id="instagram"
                          name="instagram"
                          value={registrationForm.instagram}
                          onChange={handleInputChange}
                          placeholder="@miempresa"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Descripción (opcional)</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={registrationForm.description}
                          onChange={handleInputChange}
                          placeholder="Breve descripción de tu empresa..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                        <h4 className="font-semibold text-emerald-800 mb-2">Información de Pago</h4>
                        <p className="text-sm text-emerald-700">
                          <strong>Método:</strong> Nequi<br />
                          <strong>Número:</strong> 3117700431<br />
                          <strong>Valor:</strong> $1 USD (equivalente en COP)
                        </p>
                      </div>
                      <Button 
                        onClick={handleRegister}
                        disabled={isRegistering}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3"
                      >
                        {isRegistering ? 'Enviando...' : 'Enviar Solicitud'}
                      </Button>
                      <p className="text-xs text-gray-600 text-center">
                        * Campos obligatorios. Te contactaremos para confirmar el pago.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300"
                >
                  Ver Empresas Registradas
                </Button>
              </div>
              <div className="flex items-center space-x-8 text-emerald-200">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>{stats.monthly_visitors.toLocaleString()} visitantes mensuales</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Instagram className="h-5 w-5" />
                  <span>Ideal para Instagram</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold mb-6 text-center">¿Por qué LinkHub?</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg">Pago único de solo $1 USD</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg">Exposición permanente 24/7</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg">Miles de visitantes mensuales</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-yellow-300 flex-shrink-0" />
                    <span className="text-lg">Proceso súper fácil</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              La Publicidad Más Efectiva y Económica
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mientras otros cobran cientos de dólares por publicidad, nosotros te damos exposición permanente por solo $1 USD
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 border-2 hover:border-emerald-200 group">
                <CardHeader className="pb-4">
                  <div className="text-emerald-600 mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gradient-to-r from-gray-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-emerald-600 text-white text-lg px-6 py-3 mb-6">
              {stats.total_companies}+ Empresas Satisfechas
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Resultados Reales de Empresas Reales
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 bg-white border border-emerald-100">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">{testimonial.name}</CardTitle>
                      <p className="text-emerald-600 font-medium">{testimonial.business}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 italic leading-relaxed">"{testimonial.comment}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-8">
            Precio Increíble, Resultados Reales
          </h2>
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20">
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-yellow-300 mb-2">$1</div>
              <div className="text-2xl">USD (Pago Único)</div>
              <div className="text-emerald-200 mt-2">Equivalente en COP</div>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-6 w-6 text-yellow-300" />
                <span className="text-lg">Exposición permanente en nuestro directorio</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-6 w-6 text-yellow-300" />
                <span className="text-lg">Logo y enlace a tu sitio web</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-6 w-6 text-yellow-300" />
                <span className="text-lg">Alcance a miles de visitantes mensuales</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-6 w-6 text-yellow-300" />
                <span className="text-lg">Soporte técnico incluido</span>
              </div>
            </div>
            <Dialog open={showRegistrationModal} onOpenChange={setShowRegistrationModal}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-12 py-4 text-xl rounded-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                  Registrarme Ahora
                  <TrendingUp className="ml-2 h-6 w-6" />
                </Button>
              </DialogTrigger>
            </Dialog>
            <p className="text-emerald-200 mt-6">
              Pago por Nequi: 3117700431
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Preguntas Frecuentes
            </h2>
            <p className="text-xl text-gray-600">
              Resolvemos todas tus dudas sobre LinkHub
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-emerald-100 rounded-lg px-6">
                <AccordionTrigger className="text-left text-lg font-semibold text-gray-900 hover:text-emerald-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            ¿Listo para Hacer Crecer tu Negocio?
          </h2>
          <p className="text-xl mb-8 text-emerald-100">
            Únete a las 60+ empresas que ya están generando más tráfico y ventas con LinkHub
          </p>
          <Button 
            onClick={handleRegister}
            disabled={isRegistering}
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-12 py-4 text-xl rounded-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            {isRegistering ? 'Procesando...' : 'Empezar Ahora - Solo $1 USD'}
            <Zap className="ml-2 h-6 w-6" />
          </Button>
          <p className="text-emerald-200 mt-6 text-lg">
            Proceso completamente en línea • Resultados en 24 horas
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-8 w-8 text-emerald-400" />
                <span className="text-2xl font-bold">LinkHub</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                El directorio web más efectivo y económico para empresas y emprendedores que quieren crecer.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contacto</h3>
              <div className="space-y-2 text-gray-400">
                <p>Pago Nequi: 3117700431</p>
                <p>Valor: $1 USD (equivalente en COP)</p>
                <p>Soporte 24/7 disponible</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces</h3>
              <div className="space-y-2">
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors block">Ver Directorio</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors block">Términos y Condiciones</a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors block">Soporte</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LinkHub. Hecho con ❤️ para empresas que quieren crecer.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};