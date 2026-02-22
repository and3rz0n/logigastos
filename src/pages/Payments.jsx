import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  MapPin,
  Truck,
  DollarSign,
  Search,
  Calendar,
  User,
  FileText,
  Store,
  ChevronRight,
  Filter,
  History,
  CreditCard,
  AlertCircle,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getApprovedForPayment,
  getPaidHistory,
  processBatchPayments,
} from "../services/requests";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { cn } from "../utils/cn";

export default function Payments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "pending") {
        const data = await getApprovedForPayment();
        setPending(data || []);
      } else {
        const data = await getPaidHistory();
        setHistory(data || []);
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayments = async () => {
    try {
      await processBatchPayments(selectedIds, user.id);
      toast.success(
        `¡Pago procesado correctamente! (${selectedIds.length} solicitudes)`,
      );
      setIsConfirmModalOpen(false);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error("Hubo un error al procesar los pagos");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item.id));
    }
  };

  const currentList = activeTab === "pending" ? pending : history;

  const filteredData = currentList.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.nro_transporte_sap && item.nro_transporte_sap.toLowerCase().includes(term)) ||
      (item.nombre_transportista && item.nombre_transportista.toLowerCase().includes(term)) ||
      (item.placa_vehiculo && item.placa_vehiculo.toLowerCase().includes(term));

    const itemDate = new Date(item.created_at).toISOString().split("T")[0];
    const matchesFrom = !dateFrom || itemDate >= dateFrom;
    const matchesTo = !dateTo || itemDate <= dateTo;

    return matchesSearch && matchesFrom && matchesTo;
  });

  const totalSelectedMoney = pending
    .filter((p) => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + (p.total_gasto || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <DollarSign className="text-amber-600 w-7 h-7" /> Bandeja de Pagos
          </h1>
          <p className="text-gray-500 text-sm">
            Gestiona y liquida las solicitudes aprobadas.
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveTab("pending");
            setSelectedIds([]);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
            activeTab === "pending"
              ? "bg-white dark:bg-slate-700 text-brand-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          <Clock className="w-4 h-4" /> Pendientes de Pago
        </button>
        <button
          onClick={() => {
            setActiveTab("history");
            setSelectedIds([]);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
            activeTab === "history"
              ? "bg-white dark:bg-slate-700 text-brand-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          <History className="w-4 h-4" /> Historial de Pagos
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
            Buscador
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Picking, Placa o Transportista..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
              Desde
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
              Hasta
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        {(searchTerm || dateFrom || dateTo) && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">
          Cargando información...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-700">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No hay registros</h3>
          <p className="text-gray-500">
            No se encontraron solicitudes en esta sección.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "pending" && (
            <div className="flex items-center gap-2 mb-2 ml-1">
              <button
                onClick={selectAll}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                {selectedIds.length === filteredData.length
                  ? "Desmarcar todos"
                  : "Seleccionar todos"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filteredData.map((item) => (
              <PaymentCard
                key={item.id}
                item={item}
                isPending={activeTab === "pending"}
                isSelected={selectedIds.includes(item.id)}
                onToggle={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "pending" && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="bg-brand-500 p-2 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">
                {selectedIds.length} Seleccionados
              </p>
              <p className="text-xl font-bold">
                Total: S/{" "}
                {totalSelectedMoney.toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsConfirmModalOpen(true)}
            className="bg-brand-500 hover:bg-brand-600 h-12 px-8 font-bold"
          >
            PAGAR AHORA
          </Button>
        </div>
      )}

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmar Pago Masivo"
      >
        <div className="space-y-4 pt-2">
          <p className="text-gray-600 text-sm">
            Estás por marcar como{" "}
            <span className="font-bold text-green-600 text-base">PAGADO</span>{" "}
            un total de <strong>{selectedIds.length} solicitudes</strong>.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border">
            <div className="flex justify-between text-sm mb-1">
              <span>Monto Total a Liquidar:</span>
              <span className="font-bold text-lg">
                S/{" "}
                {totalSelectedMoney.toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleProcessPayments}>
              Confirmar Pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PaymentCard({ item, isPending, isSelected, onToggle }) {
  // Función para procesar fechas de forma segura y evitar el "Invalid Date"
  const safeFormatDate = (dateStr, includeTime = false) => {
    if (!dateStr) return null;
    try {
      const cleanStr = dateStr.includes(" ")
        ? dateStr.replace(" ", "T")
        : dateStr;
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return null;

      return d.toLocaleDateString(
        "es-PE",
        includeTime
          ? {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }
          : { day: "2-digit", month: "short" },
      );
    } catch (e) {
      return null;
    }
  };

  const fSolicitud = safeFormatDate(item.created_at) || "---";
  const fFactura = item.fecha_factura
    ? safeFormatDate(item.fecha_factura + "T00:00:00")
    : "---";
  const fResolucion = safeFormatDate(item.updated_at, true) || "---";

  return (
    <div
      onClick={isPending ? onToggle : undefined}
      className={cn(
        "bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center",
        isSelected
          ? "border-brand-500 ring-2 ring-brand-500/20"
          : "border-gray-100 dark:border-slate-700 shadow-sm hover:border-gray-300",
      )}
    >
      {isPending && (
        <div
          className={cn(
            "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
            isSelected
              ? "bg-brand-500 border-brand-500"
              : "bg-white border-gray-300",
          )}
        >
          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <Store className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs uppercase">
                {item.nombre_transportista}
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Sol: {fSolicitud}
                </span>
                <span className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-400">
                  <Receipt className="w-3 h-3" /> Fac: {fFactura}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-bold",
                    isPending ? "text-green-600" : "text-blue-600",
                  )}
                >
                  <Clock className="w-3 h-3" />{" "}
                  {isPending ? "Aprobado el: " : "Pagado el: "} {fResolucion}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Monto
            </span>
            <span className="text-lg font-black text-gray-900 dark:text-white">
              S/{" "}
              {item.total_gasto?.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* FILA 2: DETALLES TÉCNICOS Y RESPONSABLES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase">
              Vehículo:
            </span>
            <span className="font-mono font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 text-xs">
              {item.placa_vehiculo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase">
              Área:
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400" /> {item.nombre_area}
            </span>
          </div>

          <div className="sm:col-span-2 flex justify-end items-center gap-2">
            {isPending ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">
                  Aprobador Asignado: {item.nombre_aprobador_asignado}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Aprobado por {item.nombre_aprobador_real && item.nombre_aprobador_real !== 'N/A' ? item.nombre_aprobador_real : item.nombre_aprobador_asignado}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                <CheckCircle className="w-3.5 h-3.5" />
                Pagado por {item.nombre_pagador}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}