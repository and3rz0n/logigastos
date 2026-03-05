import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Truck,
  DollarSign,
  AlertCircle,
  Building2,
  Search,
  Info,
  Calculator,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import {
  createRequest,
  getMasterData,
  getVehiclesByDriver,
  getDestinatarioByCode,
  getApprovers,
  getTodayPeru,
  getSystemConfig,
  checkDuplicateRequest,
} from "../services/requests";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../utils/cn";

// Utilidad para calcular días de desfase
const getDaysDiff = (dateStr) => {
  if (!dateStr) return 0;
  const today = new Date(getTodayPeru() + "T00:00:00");
  const invoiceDate = new Date(dateStr + "T00:00:00");
  const diffTime = today - invoiceDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados de configuración y UI
  const [pickingLength, setPickingLength] = useState(8);
  const [pickingError, setPickingError] = useState(false);

  const [masters, setMasters] = useState({
    canales: [],
    zonas: [],
    areas: [],
    motivosGenerales: [],
  });

  const [opciones, setOpciones] = useState({
    rutasFF: [],
    motivosCM: [],
  });

  const [vehicles, setVehicles] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [destinatarioNombre, setDestinatarioNombre] = useState(null);
  const [destinatarioId, setDestinatarioId] = useState(null);

  // Estados para el modal de desfase
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateDays, setLateDays] = useState(0);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      fecha: getTodayPeru(),
      zona: "Lima",
    },
  });

  useEffect(() => {
    if (user) {
      cargarDatosIniciales();
    }
  }, [user]);

  const cargarDatosIniciales = async () => {
    const [masterData, vehicleData, approverData, configData] =
      await Promise.all([
        getMasterData(),
        getVehiclesByDriver(user.id),
        getApprovers(),
        getSystemConfig(),
      ]);

    if (configData?.longitud_picking) {
      setPickingLength(configData.longitud_picking);
    }

    const sortAtoZ = (a, b, key) =>
      (a[key] || "").localeCompare(b[key] || "", "es");

    setMasters({
      canales: (masterData.canales || []).sort((a, b) =>
        sortAtoZ(a, b, "nombre"),
      ),
      zonas: (masterData.zonas || []).sort((a, b) => sortAtoZ(a, b, "nombre")),
      areas: (masterData.areas || []).sort((a, b) => sortAtoZ(a, b, "nombre")),
      motivosGenerales: (masterData.motivos || []).sort((a, b) =>
        sortAtoZ(a, b, "nombre"),
      ),
    });

    setVehicles((vehicleData || []).sort((a, b) => sortAtoZ(a, b, "placa")));
    setApprovers(
      (approverData || []).sort((a, b) => sortAtoZ(a, b, "nombre_completo")),
    );

    const { data: optionsData } = await supabase
      .from("maestros_opciones")
      .select("*")
      .eq("activo", true);

    if (optionsData) {
      setOpciones({
        rutasFF: optionsData
          .filter((o) => o.categoria === "ruta_ff")
          .sort((a, b) => sortAtoZ(a, b, "etiqueta")),
        motivosCM: optionsData
          .filter((o) => o.categoria === "motivo_cm")
          .sort((a, b) => sortAtoZ(a, b, "etiqueta")),
      });
    }
  };

  const vehiculoId = watch("vehiculo_id");
  const codigoDest = watch("codigo_destinatario");
  const tipoGasto = watch("tipo_gasto");
  const zona = watch("zona");
  const volumen = watch("volumen");
  const tarifa = watch("precio_unitario");
  const fechaSeleccionada = watch("fecha");

  // Cálculo en vivo del desfase para la tarjetita UI
  const diasDesfase = getDaysDiff(fechaSeleccionada);
  const esDesfase = diasDesfase > 7;

  useEffect(() => {
    const buscarDestinatario = async () => {
      if (codigoDest?.length >= 4) {
        const dest = await getDestinatarioByCode(codigoDest);
        if (dest) {
          setDestinatarioNombre(dest.nombre_destinatario);
          setDestinatarioId(dest.id);
          if (dest.canal) setValue("canal", dest.canal);
        } else {
          setDestinatarioNombre(null);
          setDestinatarioId(null);
        }
      }
    };
    const timer = setTimeout(buscarDestinatario, 500);
    return () => clearTimeout(timer);
  }, [codigoDest, setValue]);

  useEffect(() => {
    setValue("monto", "");
    setValue("volumen", "");
    setValue("precio_unitario", "");
    setValue("ruta_falso_flete", "");
    setValue("sustento", "");
    setValue("motivo_gasto", "");
  }, [tipoGasto, setValue]);

  useEffect(() => {
    if (!vehiculoId || !tipoGasto) return;
    if (
      ["Gasto Adicional", "Zona rígida", "Último Punto", "Maniobras"].includes(
        tipoGasto,
      )
    )
      return;

    const vehiculoSeleccionado = vehicles.find((v) => v.id === vehiculoId);
    if (!vehiculoSeleccionado) return;

    const capacidad = parseFloat(vehiculoSeleccionado.capacidad_m3 || 0);
    const vol = parseFloat(volumen || 0);
    const tar = parseFloat(tarifa || 0);

    let totalCalculado = 0;

    if (tipoGasto === "Falso Flete") {
      if (vol > 0 && tar > 0) {
        totalCalculado = vol * tar;
      }
    } else if (tipoGasto === "Carga < al % mínimo") {
      if (capacidad > 0 && tar > 0) {
        const zonaObj = masters.zonas.find((z) => z.nombre === zona);
        const porcentaje =
          zonaObj && zonaObj.porcentaje_minimo
            ? parseFloat(zonaObj.porcentaje_minimo)
            : 80;
        const factor = porcentaje / 100;

        const volumenMinimoRequerido = capacidad * factor;
        const volumenPagable = volumenMinimoRequerido - vol;

        if (volumenPagable > 0) {
          totalCalculado = volumenPagable * tar;
        } else {
          totalCalculado = 0;
        }
      }
    }

    if (totalCalculado > 0) {
      setValue("monto", totalCalculado.toFixed(2));
    } else {
      setValue("monto", "");
    }
  }, [
    tipoGasto,
    volumen,
    tarifa,
    vehiculoId,
    zona,
    vehicles,
    masters.zonas,
    setValue,
  ]);

  const renderContextCard = () => {
    if (!tipoGasto) return null;

    if (tipoGasto === "Falso Flete") {
      return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
              Sobre Falso Flete
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Indique el volumen pactado y el precio por <strong>m³</strong>{" "}
              según contrato para <strong>falsos fletes</strong>.
            </p>
          </div>
        </div>
      );
    }

    if (
      ["Gasto Adicional", "Zona rígida", "Último Punto", "Maniobras"].includes(
        tipoGasto,
      )
    ) {
      return (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
              Requisito de Sustento
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              El monto debe ser <strong>SIN IGV</strong>. En el sustento
              detalla: Concepto, Cantidad y Precio Unitario.
            </p>
          </div>
        </div>
      );
    }

    if (tipoGasto === "Carga < al % mínimo") {
      const zonaObj = masters.zonas.find((z) => z.nombre === zona);
      const porcentaje =
        zonaObj && zonaObj.porcentaje_minimo ? zonaObj.porcentaje_minimo : 80;

      return (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex gap-3 animate-in fade-in">
          <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-purple-800 dark:text-purple-200">
              Cálculo Automático ({zona})
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Se aplicará la fórmula según contrato ({porcentaje}%):
              <br />
              <code className="bg-purple-100 dark:bg-purple-900/50 px-1 py-0.5 rounded text-xs font-mono font-bold">
                (Vol. Mínimo - Vol. Cargado) x Tarifa
              </code>
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // PASO 1: Intercepción y validación
  const onSubmit = async (data) => {
    if (!destinatarioId) {
      toast.error("Código de destinatario inválido");
      return;
    }

    if (data.nro_transporte.length !== pickingLength) {
      setPickingError(true);
      toast.error(
        `El N° de Transporte (Picking) debe tener exactamente ${pickingLength} dígitos.`,
      );
      return;
    }

    if (
      data.tipo_gasto === "Carga < al % mínimo" &&
      (!data.monto || parseFloat(data.monto) <= 0)
    ) {
      toast.error("El volumen cargado supera el mínimo. No aplica cobro.");
      return;
    }

    // Comprobar si hay desfase
    const desfase = getDaysDiff(data.fecha);

    if (desfase > 7) {
      // Abrimos el modal y pausamos el proceso
      setLateDays(desfase);
      setPendingFormData(data);
      setShowLateModal(true);
    } else {
      // Guardamos directamente si no hay desfase
      await processRegistration(data);
    }
  };

  // PASO 2: Guardado Real en Base de Datos
  const processRegistration = async (data) => {
    setIsSaving(true);
    try {
      const motivoFinal = data.motivo_gasto || data.sustento || "";

      const isDuplicate = await checkDuplicateRequest(
        user.id,
        data.nro_transporte,
        data.tipo_gasto,
        motivoFinal,
        destinatarioId,
      );

      if (isDuplicate) {
        toast.error("Gasto Duplicado", {
          description:
            "Ya existe un gasto registrado para este Picking, Cliente y Motivo.",
        });
        return;
      }

      let volumen_minimo_m3 = null;
      let tarifa_m3 = null;
      let monto_liquidar_programador = null;

      if (data.tipo_gasto === "Carga < al % mínimo") {
        const vehiculoSeleccionado = vehicles.find(
          (v) => v.id === data.vehiculo_id,
        );
        const capacidad = parseFloat(vehiculoSeleccionado?.capacidad_m3 || 0);

        const zonaObj = masters.zonas.find((z) => z.nombre === data.zona);
        const porcentaje =
          zonaObj && zonaObj.porcentaje_minimo
            ? parseFloat(zonaObj.porcentaje_minimo)
            : 80;
        const factor = porcentaje / 100;

        volumen_minimo_m3 = parseFloat((capacidad * factor).toFixed(3));
        tarifa_m3 = parseFloat(data.precio_unitario || 0);
        monto_liquidar_programador = parseFloat(data.monto || 0);
      }

      await createRequest({
        ...data,
        transportista_id: user.id,
        destinatario_id: destinatarioId,
        motivo_gasto: motivoFinal,
        sustento_texto: data.sustento || "",
        volumen_minimo_m3,
        tarifa_m3,
        monto_liquidar_programador,
      });

      toast.success("¡Solicitud registrada correctamente!");
      navigate("/mis-solicitudes");
    } catch (error) {
      toast.error("Error al guardar", { description: error.message });
    } finally {
      setIsSaving(false);
      setShowLateModal(false);
    }
  };

  const motivosFiltrados = masters.motivosGenerales.filter(
    (m) => m.tipo_gasto === tipoGasto,
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigate("/mis-solicitudes")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
            Nueva Solicitud
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Registro inteligente de gastos logísticos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
          <h3 className="text-sm font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4" /> Datos del Transporte
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Placa del Vehículo
              </label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                {...register("vehiculo_id", {
                  required: "Selecciona una placa",
                })}
              >
                <option value="">Seleccionar Placa...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} (Cap: {v.capacidad_m3}m³)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                N° Transporte (Picking)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={`Ej: ${"6050432100".slice(0, pickingLength)}`}
                maxLength={pickingLength}
                className={cn(
                  pickingError && "border-red-500 focus:ring-red-500",
                )}
                {...register("nro_transporte", {
                  required: true,
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    if (e.target.value.length === pickingLength)
                      setPickingError(false);
                  },
                  onBlur: (e) => {
                    if (
                      e.target.value.length > 0 &&
                      e.target.value.length < pickingLength
                    )
                      setPickingError(true);
                    else setPickingError(false);
                  },
                })}
              />
              {pickingError && (
                <p className="text-xs text-red-500 font-bold mt-1 animate-in fade-in">
                  Picking incorrecto
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Código Destinatario
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Ej: 62390"
                  className="pl-10"
                  {...register("codigo_destinatario", { required: true })}
                />
              </div>
              {destinatarioNombre && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg flex items-center gap-2 animate-in fade-in border border-green-100 dark:border-green-800">
                  <Building2 className="w-4 h-4" /> {destinatarioNombre}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Responsable Negociación
              </label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                {...register("usuario_id", { required: true })}
              >
                <option value="">Seleccionar Aprobador...</option>
                {approvers.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Zona de Destino
              </label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                {...register("zona", { required: true })}
              >
                {masters.zonas.length > 0 ? (
                  masters.zonas.map((z) => (
                    <option key={z.id} value={z.nombre}>
                      {z.nombre}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Lima">Lima</option>
                    <option value="Provincia">Provincia</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Canal
              </label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                {...register("canal", { required: true })}
              >
                <option value="">Seleccionar...</option>
                {masters.canales.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium dark:text-gray-300">
                Fecha Factura
              </label>
              <Input 
                type="date" 
                className="w-full text-sm dark:text-white appearance-none min-w-0" 
                {...register("fecha", { required: true })} 
              />
            </div>

            {/* TARJETA INFORMATIVA DE DESFASE (NUEVA) */}
            <div className="md:col-span-2 mt-2">
              <div
                className={cn(
                  "p-4 rounded-xl border flex gap-3 animate-in fade-in transition-colors",
                  esDesfase
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                )}
              >
                <Info
                  className={cn(
                    "w-5 h-5 flex-shrink-0 mt-0.5",
                    esDesfase ? "text-red-500" : "text-blue-500",
                  )}
                />
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      esDesfase
                        ? "text-red-800 dark:text-red-200"
                        : "text-blue-800 dark:text-blue-200",
                    )}
                  >
                    {esDesfase
                      ? `¡Atención! Este gasto tiene ${diasDesfase} días de desfase.`
                      : "Registro de gastos a tiempo"}
                  </p>
                  <p
                    className={cn(
                      "text-sm",
                      esDesfase
                        ? "text-red-700 dark:text-red-300"
                        : "text-blue-700 dark:text-blue-300",
                    )}
                  >
                    Recuerda registrar tus gastos a tiempo. Máximo son 7 días
                    luego de la fecha de factura.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
          <div className="flex flex-col space-y-4">
            <h3 className="text-sm font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Detalle Económico
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Área Atribuible
              </label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                {...register("area_id", { required: true })}
              >
                <option value="">Seleccionar Área...</option>
                {masters.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium dark:text-gray-300">
              Tipo de Gasto
            </label>
            <select
              className="w-full h-12 rounded-xl border-gray-300 bg-brand-50/50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-300 font-bold outline-none focus:ring-2 focus:ring-brand-500"
              {...register("tipo_gasto", { required: true })}
            >
              <option value="">Seleccionar Tipo...</option>

              <optgroup label="1. Gastos Adicionales">
                <option value="Falso Flete">1.1. Falso Flete</option>
                <option value="Gasto Adicional">1.2. Gasto Adicional</option>
                <option value="Último Punto">1.3. Último Punto</option>
                <option value="Zona rígida">1.4. Zona rígida</option>
              </optgroup>

              <optgroup label="2. Maniobras">
                <option value="Maniobras">2.1. Maniobras</option>
              </optgroup>

              <optgroup label="3. Ocupabilidad">
                <option value="Carga < al % mínimo">
                  3.1. Carga &lt; al % mínimo
                </option>
              </optgroup>
            </select>
          </div>

          {tipoGasto && (
            <div className="space-y-2 animate-in slide-in-from-left-2">
              <label className="text-sm font-medium dark:text-gray-300">
                Motivo del Gasto
              </label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                {...register("motivo_gasto", {
                  required: "Selecciona un motivo",
                })}
              >
                <option value="">Seleccionar Motivo...</option>
                {motivosFiltrados.map((m) => (
                  <option key={m.id} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {renderContextCard()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {tipoGasto === "Falso Flete" && (
              <>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">
                    Ruta del Falso Flete
                  </label>
                  <select
                    className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                    {...register("ruta_falso_flete", {
                      required: "Selecciona una ruta",
                    })}
                  >
                    <option value="">Seleccionar Ruta...</option>
                    {opciones.rutasFF.map((op) => (
                      <option key={op.id} value={op.valor}>
                        {op.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">
                    Volumen (m³)
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    {...register("volumen")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">
                    Tarifa Pactada (S/)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("precio_unitario")}
                  />
                </div>
              </>
            )}

            {tipoGasto === "Carga < al % mínimo" && (
              <>
                                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">
                    Volumen Cargado Real (m³)
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    {...register("volumen")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">
                    Tarifa (S/)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("precio_unitario")}
                  />
                </div>
              </>
            )}

            {[
              "Gasto Adicional",
              "Zona rígida",
              "Último Punto",
              "Maniobras",
            ].includes(tipoGasto) && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium dark:text-gray-300">
                  Sustento Detallado
                </label>
                <Input
                  placeholder="Ej: 2 estibas, S/40 c/u"
                  {...register("sustento", { required: true })}
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-900 dark:text-white">
                Monto Total a Pagar
              </label>
              <div className="w-1/2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  S/
                </span>
                <Input
                  type="number"
                  step="0.01"
                  className={cn(
                    "pl-10 text-right text-xl font-bold h-14",
                    tipoGasto === "Falso Flete" ||
                      tipoGasto === "Carga < al % mínimo"
                      ? "bg-gray-100 dark:bg-slate-900 text-brand-700 dark:text-brand-400 cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 border-brand-200 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-brand-500",
                  )}
                  readOnly={
                    tipoGasto === "Falso Flete" ||
                    tipoGasto === "Carga < al % mínimo"
                  }
                  placeholder="0.00"
                  {...register("monto", { required: true, min: 0.1 })}
                />
              </div>
            </div>
            {tipoGasto === "Carga < al % mínimo" &&
              volumen &&
              tarifa &&
              !watch("monto") && (
                <p className="text-xs text-right text-red-500 dark:text-red-400 mt-2 font-medium">
                  * El volumen cargado supera el mínimo. No corresponde pago
                  adicional.
                </p>
              )}
          </div>
        </section>

        <Button
          type="submit"
          className="w-full h-14 text-lg font-bold shadow-xl shadow-brand-700/20 dark:shadow-none"
          isLoading={isSubmitting || isSaving}
        >
          <Save className="mr-2 h-5 w-5" /> Registrar Solicitud
        </Button>
      </form>

      {/* MODAL DE DESFASE (NUEVO - CON PORTAL) */}
      {showLateModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-red-100 dark:border-slate-700">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="w-8 h-8 flex-shrink-0" />
                <h3 className="text-xl font-bold">Registro con Desfase</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-8 text-base leading-relaxed">
                ¿Seguro que desea registrar su solicitud de gasto con desfase?
                Han pasado{" "}
                <strong className="text-red-600 dark:text-red-400 font-extrabold">
                  {lateDays} días
                </strong>{" "}
                con respecto a la fecha de la factura.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowLateModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => processRegistration(pendingFormData)}
                  isLoading={isSaving}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  Sí, registrar con desfase
                </Button>
              </div>
            </div>
          </div>,
          document.body, // <-- EL DESTINO DE LA TELETRANSPORTACIÓN
        )}
    </div>
  );
}
