import { useState, useEffect } from "react";
import { api } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Plus, Clock, User, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Appointments = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    dentist_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    duration: 60,
    reason: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const [appointmentsRes, patientsRes, dentistsRes] = await Promise.all([
        api.get(`/appointments?date=${format(selectedDate, "yyyy-MM-dd")}`),
        api.get("/patients"),
        api.get("/dentists"),
      ]);
      setAppointments(appointmentsRes.data);
      setPatients(patientsRes.data);
      setDentists(dentistsRes.data);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAppointment) {
        await api.put(`/appointments/${editingAppointment.id}`, formData);
        toast.success("Cita actualizada exitosamente");
      } else {
        await api.post("/appointments", formData);
        toast.success("Cita creada exitosamente");
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar cita");
    }
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      patient_id: appointment.patient_id,
      dentist_id: appointment.dentist_id,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      reason: appointment.reason,
      notes: appointment.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (appointmentId) => {
    if (window.confirm("¿Estás seguro de eliminar esta cita?")) {
      try {
        await api.delete(`/appointments/${appointmentId}`);
        toast.success("Cita eliminada exitosamente");
        loadData();
      } catch (error) {
        toast.error("Error al eliminar cita");
      }
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      toast.success("Estado actualizado");
      loadData();
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      dentist_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      duration: 60,
      reason: "",
      notes: "",
    });
    setEditingAppointment(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fadeIn" data-testid="appointments-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Citas</h1>
        <p className="text-gray-600">Administra las citas del consultorio</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                data-testid="select-date-button"
                variant="outline"
                className="w-full md:w-auto justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-appointment-button"
                onClick={resetForm}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAppointment ? "Editar Cita" : "Nueva Cita"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient_id">Paciente *</Label>
                    <select
                      id="patient_id"
                      data-testid="appointment-patient-select"
                      value={formData.patient_id}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar paciente</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dentist_id">Dentista *</Label>
                    <select
                      id="dentist_id"
                      data-testid="appointment-dentist-select"
                      value={formData.dentist_id}
                      onChange={(e) => setFormData({ ...formData, dentist_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar dentista</option>
                      {dentists.map((dentist) => (
                        <option key={dentist.id} value={dentist.id}>
                          {dentist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha *</Label>
                    <Input
                      id="date"
                      data-testid="appointment-date-input"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Hora *</Label>
                    <Input
                      id="time"
                      data-testid="appointment-time-input"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración (minutos) *</Label>
                    <Input
                      id="duration"
                      data-testid="appointment-duration-input"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo *</Label>
                    <Input
                      id="reason"
                      data-testid="appointment-reason-input"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      placeholder="Ej: Limpieza dental"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <textarea
                      id="notes"
                      data-testid="appointment-notes-input"
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
                  <Button type="submit" data-testid="save-appointment-button" className="bg-blue-600 hover:bg-blue-700">
                    {editingAppointment ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay citas para esta fecha</p>
            </div>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                data-testid={`appointment-card-${appointment.id}`}
                className="bg-gradient-to-r from-white to-blue-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {appointment.patient_name}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Dentista: {appointment.dentist_name}
                          </p>
                          <p>Motivo: {appointment.reason}</p>
                          <p>
                            Hora: {appointment.time} ({appointment.duration} min)
                          </p>
                          {appointment.notes && <p className="text-gray-500">Notas: {appointment.notes}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:items-end gap-3">
                    <select
                      data-testid={`appointment-status-${appointment.id}`}
                      value={appointment.status}
                      onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-blue-500 ${
                        appointment.status === "programada"
                          ? "bg-yellow-100 text-yellow-700"
                          : appointment.status === "completada"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      <option value="programada">Programada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        data-testid={`edit-appointment-${appointment.id}`}
                        onClick={() => handleEdit(appointment)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        data-testid={`delete-appointment-${appointment.id}`}
                        onClick={() => handleDelete(appointment.id)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};