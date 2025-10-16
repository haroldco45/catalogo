import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Search, Phone, Mail, FileText, Trash2 } from "lucide-react";

export const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    birth_date: "",
    address: "",
    emergency_contact: "",
    notes: "",
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const filtered = patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.includes(searchTerm) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  const loadPatients = async () => {
    try {
      const response = await api.get("/patients");
      setPatients(response.data);
      setFilteredPatients(response.data);
    } catch (error) {
      toast.error("Error al cargar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, formData);
        toast.success("Paciente actualizado exitosamente");
      } else {
        await api.post("/patients", formData);
        toast.success("Paciente creado exitosamente");
      }
      setDialogOpen(false);
      resetForm();
      loadPatients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar paciente");
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      phone: patient.phone,
      email: patient.email || "",
      birth_date: patient.birth_date || "",
      address: patient.address || "",
      emergency_contact: patient.emergency_contact || "",
      notes: patient.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (patientId) => {
    if (window.confirm("¿Estás seguro de eliminar este paciente?")) {
      try {
        await api.delete(`/patients/${patientId}`);
        toast.success("Paciente eliminado exitosamente");
        loadPatients();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Error al eliminar paciente");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      birth_date: "",
      address: "",
      emergency_contact: "",
      notes: "",
    });
    setEditingPatient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fadeIn" data-testid="patients-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Pacientes</h1>
        <p className="text-sm md:text-base text-gray-600">Gestiona la información de tus pacientes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              data-testid="search-patients-input"
              type="text"
              placeholder="Buscar paciente por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-patient-button"
                onClick={resetForm}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPatient ? "Editar Paciente" : "Nuevo Paciente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      data-testid="patient-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      data-testid="patient-phone-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      data-testid="patient-email-input"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                    <Input
                      id="birth_date"
                      data-testid="patient-birthdate-input"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      data-testid="patient-address-input"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="emergency_contact">Contacto de emergencia</Label>
                    <Input
                      id="emergency_contact"
                      data-testid="patient-emergency-input"
                      value={formData.emergency_contact}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <textarea
                      id="notes"
                      data-testid="patient-notes-input"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="save-patient-button" className="bg-blue-600 hover:bg-blue-700">
                    {editingPatient ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              data-testid={`patient-card-${patient.id}`}
              className="bg-gradient-to-br from-white to-blue-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{patient.name}</h3>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {patient.phone}
                    </div>
                    {patient.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {patient.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                <Button
                  data-testid={`view-history-${patient.id}`}
                  onClick={() => navigate(`/medical-history/${patient.id}`)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Historial
                </Button>
                <Button
                  data-testid={`edit-patient-${patient.id}`}
                  onClick={() => handleEdit(patient)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Editar
                </Button>
                <Button
                  data-testid={`delete-patient-${patient.id}`}
                  onClick={() => handleDelete(patient.id)}
                  variant="outline"
                  size="sm"
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "No se encontraron pacientes" : "No hay pacientes registrados"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};