import React, { useState } from 'react';
import axios from 'axios';
import { Search, Car, User, Phone, Mail, MapPin, Calendar, DollarSign, ClipboardList } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Buscar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);
      const response = await axios.get(`${API}/buscar?placa=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Completado':
        return 'badge badge-success';
      case 'En Proceso':
        return 'badge badge-warning';
      case 'Pendiente':
        return 'badge badge-info';
      case 'Cancelado':
        return 'badge badge-error';
      default:
        return 'badge badge-info';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Buscar por Placa</h1>
        <p className="mt-2 text-gray-600">
          Busca información completa de vehículos, clientes y servicios por placa
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10"
                placeholder="Ingresa la placa del vehículo (ej: ABC123)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Buscando...</span>
        </div>
      )}

      {/* No Results */}
      {hasSearched && !loading && (!searchResults || !searchResults.vehiculo) && (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center">
            <Car className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontró el vehículo</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontró ningún vehículo con la placa "{searchTerm}"
            </p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults && searchResults.vehiculo && (
        <div className="space-y-6">
          {/* Vehicle and Client Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicle Card */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Car className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Información del Vehículo</h3>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Placa</dt>
                    <dd className="text-sm text-gray-900 font-bold text-lg">
                      {searchResults.vehiculo.placa}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                    <dd className="text-sm text-gray-900">{searchResults.vehiculo.tipo}</dd>
                  </div>
                  {searchResults.vehiculo.marca && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Marca</dt>
                      <dd className="text-sm text-gray-900">{searchResults.vehiculo.marca}</dd>
                    </div>
                  )}
                  {searchResults.vehiculo.modelo && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Modelo</dt>
                      <dd className="text-sm text-gray-900">{searchResults.vehiculo.modelo}</dd>
                    </div>
                  )}
                  {searchResults.vehiculo.color && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Color</dt>
                      <dd className="text-sm text-gray-900">{searchResults.vehiculo.color}</dd>
                    </div>
                  )}
                  {searchResults.vehiculo.ano && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Año</dt>
                      <dd className="text-sm text-gray-900">{searchResults.vehiculo.ano}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Fecha de Registro</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(searchResults.vehiculo.fecha_registro).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Client Card */}
            {searchResults.cliente && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Información del Cliente</h3>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                      <dd className="text-sm text-gray-900 font-medium">
                        {searchResults.cliente.nombre}
                      </dd>
                    </div>
                    {searchResults.cliente.telefono && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                        <dd className="text-sm text-gray-900 flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {searchResults.cliente.telefono}
                        </dd>
                      </div>
                    )}
                    {searchResults.cliente.email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="text-sm text-gray-900 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {searchResults.cliente.email}
                        </dd>
                      </div>
                    )}
                    {searchResults.cliente.direccion && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Dirección</dt>
                        <dd className="text-sm text-gray-900 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {searchResults.cliente.direccion}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cliente desde</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(searchResults.cliente.fecha_registro).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>

          {/* Services History */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Historial de Servicios</h3>
                    <p className="text-sm text-gray-500">
                      {searchResults.servicios.length} servicios realizados
                    </p>
                  </div>
                </div>
                {searchResults.servicios.length > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total invertido</div>
                    <div className="text-lg font-bold text-green-600">
                      ${searchResults.servicios.reduce((sum, s) => sum + s.costo, 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200">
              {searchResults.servicios.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No se han registrado servicios para este vehículo
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {searchResults.servicios.map((servicio, index) => (
                    <li key={servicio.servicio_id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-indigo-600">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              Servicio realizado
                            </div>
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span className="mr-4">
                                {new Date(servicio.fecha_servicio).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <DollarSign className="h-4 w-4 mr-1" />
                              <span className="font-medium">${servicio.costo.toFixed(2)}</span>
                            </div>
                            {servicio.notas && (
                              <div className="text-sm text-gray-500 mt-1 italic">
                                "{servicio.notas}"
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={getEstadoBadgeClass(servicio.estado)}>
                            {servicio.estado}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Service Summary */}
          {searchResults.servicios.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Servicios</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {searchResults.servicios.length}
                  </div>
                  <div className="text-sm text-gray-500">Total de Servicios</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${searchResults.servicios.reduce((sum, s) => sum + s.costo, 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Total Gastado</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${searchResults.servicios.length > 0 
                      ? (searchResults.servicios.reduce((sum, s) => sum + s.costo, 0) / searchResults.servicios.length).toFixed(2)
                      : '0.00'
                    }
                  </div>
                  <div className="text-sm text-gray-500">Promedio por Servicio</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Buscar;