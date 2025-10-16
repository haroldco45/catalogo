import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const MedicalHistory = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    treatment: "",
    diagnosis: "",
    notes: "",
    cost: "",
  });

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      const [patientRes, historyRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/medical-history/patient/${patientId}`),
      ]);
      setPatient(patientRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/medical-history", {
        patient_id: patientId,
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null,
      });
      toast.success("Registro agregado exitosamente");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar registro");
    }
  };

  const resetForm = () => {
    setFormData({
      treatment: "",
      diagnosis: "",
      notes: "",
      cost: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fadeIn" data-testid="medical-history-page">
      <div className="mb-8">
        <Button
          data-testid="back-to-patients"
          onClick={() => navigate("/patients")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a pacientes
        </Button>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Historial Clínico
        </h1>
        <p className="text-gray-600">Paciente: {patient?.name}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Registros Médicos</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-history-button"
                onClick={resetForm}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Registro Médico</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="treatment">Tratamiento *</Label>
                  <Input
                    id="treatment"
                    data-testid="history-treatment-input"
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    required
                    placeholder="Ej: Limpieza dental profunda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnóstico *</Label>
                  <Input
                    id="diagnosis"
                    data-testid="history-diagnosis-input"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    required
                    placeholder="Ej: Gingivitis leve"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo (COP)</Label>
                  <Input
                    id="cost"
                    data-testid="history-cost-input"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="150000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <textarea
                    id="notes"
                    data-testid="history-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                    placeholder="Observaciones del tratamiento..."
                  />
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
                  <Button type="submit" data-testid="save-history-button" className="bg-blue-600 hover:bg-blue-700">
                    Guardar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay registros médicos</p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                data-testid={`history-record-${record.id}`}
                className="bg-gradient-to-r from-white to-blue-50 border border-gray-200 rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {record.treatment}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {format(new Date(record.date), "PPP", { locale: es })}
                    </p>
                  </div>
                  {record.cost && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Costo</p>
                      <p className="font-bold text-blue-600">
                        ${record.cost.toLocaleString("es-CO")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Diagnóstico:</p>
                    <p className="text-gray-600">{record.diagnosis}</p>
                  </div>
                  {record.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Notas:</p>
                      <p className="text-gray-600">{record.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};