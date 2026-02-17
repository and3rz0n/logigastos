import { useEffect, useState } from "react";
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
  Calculator
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase"; 
import {
  createRequest,
  getMasterData,
  getVehiclesByDriver,
  getDestinatarioByCode,
  getApprovers,
  getTodayPeru, // <--- Nueva utilidad para corregir la fecha
} from "../services/requests";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { cn } from "../utils/cn";

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [masters, setMasters] = useState({
    canales: [],
    zonas: [],
    areas: [],
    motivosGenerales: [],
  });
  
  const [opciones, setOpciones] = useState({
    rutasFF: [],
    motivosCM: []
  });

  const [vehicles, setVehicles] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [destinatarioNombre, setDestinatarioNombre] = useState(null);
  const [destinatarioId, setDestinatarioId] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      fecha: getTodayPeru(), // <--- Ahora inicia siempre con la fecha de Perú
      zona: "Lima",
    },
  });

  useEffect(() => {
    if (user) {
      cargarDatosIniciales();
    }
  }, [user]);

  const cargarDatosIniciales = async () => {
    const [masterData, vehicleData, approverData] = await Promise.all([
      getMasterData(),
      getVehiclesByDriver(user.id),
      getApprovers(),
    ]);

    setMasters({
        ...masterData,
        motivosGenerales: masterData.motivos || []
    });
    setVehicles(vehicleData);
    setApprovers(approverData);

    const { data: optionsData } = await supabase
      .from('maestros_opciones')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });
    
    if (optionsData) {
      setOpciones({
        rutasFF: optionsData.filter(o => o.categoria === 'ruta_ff'),
        motivosCM: optionsData.filter(o => o.categoria === 'motivo_cm')
      });
    }
  };

  const vehiculoId = watch("vehiculo_id");
  const codigoDest = watch("codigo_destinatario");
  const tipoGasto = watch("tipo_gasto");
  const zona = watch("zona");
  const volumen = watch("volumen");
  const tarifa = watch("precio_unitario");

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
    setValue("motivo_texto", ""); 
  }, [tipoGasto, setValue]);

  useEffect(() => {
    if (!vehiculoId || !tipoGasto) return;
    if (["Gasto Adicional", "Zona Rígida", "Último Punto"].includes(tipoGasto)) return;

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
    }
    else if (tipoGasto === "Carga < al % mínimo") {
      if (capacidad > 0 && tar > 0) {
        const factor = zona === "Lima" ? 0.8 : 0.85;
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
  }, [tipoGasto, volumen, tarifa, vehiculoId, zona, vehicles, setValue]);

  const renderContextCard = () => {
    if (!tipoGasto) return null;

    if (tipoGasto === "Falso Flete") {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-blue-800">Sobre Falso Flete</p>
            <p className="text-sm text-blue-700">
              Recuerda: Si el volumen es <strong>&lt; 80%</strong> de la capacidad, registra el valor al 80% como indica tu contrato.
            </p>
            <p className="text-sm text-blue-700">
              Indique el precio por <strong>m³</strong> según contrato para <strong>falsos fletes</strong>.
            </p>
          </div>
        </div>
      );
    }

    if (["Gasto Adicional", "Zona Rígida", "Último Punto"].includes(tipoGasto)) {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-orange-800">Requisito de Sustento</p>
            <p className="text-sm text-orange-700">
              El monto debe ser <strong>SIN IGV</strong>. En el sustento detalla: Concepto, Cantidad y Precio Unitario.
            </p>
          </div>
        </div>
      );
    }

    if (tipoGasto === "Carga < al % mínimo") {
        const factorTexto = zona === "Lima" ? "80%" : "85%";
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex gap-3 animate-in fade-in">
            <Calculator className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-purple-800">Cálculo Automático ({zona})</p>
              <p className="text-sm text-purple-700">
                Se aplicará la fórmula según contrato ({factorTexto}):
                <br/>
                <code className="bg-purple-100 px-1 py-0.5 rounded text-xs font-mono font-bold">
                  (Vol. Mínimo - Vol. Cargado) x Tarifa
                </code>
              </p>
            </div>
          </div>
        );
      }

    return null;
  };

  const onSubmit = async (data) => {
    try {
      if (!destinatarioId) {
        toast.error("Código de destinatario inválido");
        return;
      }

      if (data.tipo_gasto === "Carga < al % mínimo" && (!data.monto || parseFloat(data.monto) <= 0)) {
        toast.error("El volumen cargado supera el mínimo. No aplica cobro.");
        return;
      }

      await createRequest({
        ...data,
        transportista_id: user.id,
        destinatario_id: destinatarioId,
        motivo_gasto: data.motivo_texto || data.sustento || "", 
        sustento_texto: data.sustento || "",
      });

      toast.success("¡Solicitud registrada correctamente!");
      navigate("/mis-solicitudes");
    } catch (error) {
      toast.error("Error al guardar", { description: error.message });
    }
  };

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
          <p className="text-gray-500 text-sm">
            Registro inteligente de gastos logísticos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
          <h3 className="text-sm font-bold text-brand-700 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4" /> Datos del Transporte
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Placa del Vehículo</label>
              <select
                className="w-full h-12 rounded-xl border-gray-300 dark:bg-slate-900 dark:border-slate-700"
                {...register("vehiculo_id", { required: "Selecciona una placa" })}
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
              <label className="text-sm font-medium">N° Transporte (Picking)</label>
              <Input
                type="number"
                placeholder="Ej: 6050..."
                {...register("nro_transporte", { required: true })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Código Destinatario</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Ej: 62390"
                  className="pl-10"
                  {...register("codigo_destinatario", { required: true })}
                />
              </div>
              {destinatarioNombre && (
                <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg flex items-center gap-2 animate-in fade-in">
                  <Building2 className="w-4 h-4" /> {destinatarioNombre}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Responsable Negociación</label>
              <select
                className="w-full h-12 rounded-xl border-gray-300"
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
              <label className="text-sm font-medium">Zona de Destino</label>
              <select
                className="w-full h-12 rounded-xl border-gray-300"
                {...register("zona", { required: true })}
              >
                 {masters.zonas.length > 0 ? masters.zonas.map((z) => (
                  <option key={z.id} value={z.nombre}>{z.nombre}</option>
                 )) : (
                   <>
                     <option value="Lima">Lima</option>
                     <option value="Provincia">Provincia</option>
                   </>
                 )}
              </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <select className="w-full h-12 rounded-xl border-gray-300" {...register("canal", { required: true })}>
                    <option value="">Seleccionar...</option>
                    {masters.canales.map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                </select>
            </div>

             <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Factura</label>
                <Input type="date" {...register("fecha", { required: true })} />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-700 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Detalle Económico
            </h3>
            <div className="w-1/3">
                 <select className="w-full text-xs h-8 rounded-lg border-gray-200 bg-gray-50" {...register("area_id", { required: true })}>
                    <option value="">Área Atribuible...</option>
                    {masters.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Gasto</label>
            <select
              className="w-full h-12 rounded-xl border-gray-300 bg-brand-50/50 border-brand-200 text-brand-900 font-bold"
              {...register("tipo_gasto", { required: true })}
            >
              <option value="">Seleccionar Tipo...</option>
              <option value="Falso Flete">Falso Flete</option>
              <option value="Carga < al % mínimo">Carga &lt; al Mínimo</option>
              <option value="Gasto Adicional">Gasto Adicional</option>
              <option value="Zona Rígida">Zona Rígida</option>
              <option value="Último Punto">Último Punto</option>
            </select>
          </div>

          {renderContextCard()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {tipoGasto === "Falso Flete" && (
                <>
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium">Ruta del Falso Flete</label>
                        <select 
                            className="w-full h-12 rounded-xl border-gray-300"
                            {...register("ruta_falso_flete", { required: "Selecciona una ruta" })}
                        >
                            <option value="">Seleccionar Ruta...</option>
                            {opciones.rutasFF.map((op) => (
                                <option key={op.id} value={op.valor}>{op.etiqueta}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Volumen (m³)</label>
                        <Input type="number" step="0.01" placeholder="0.00" {...register("volumen")} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tarifa Pactada (S/)</label>
                        <Input type="number" step="0.01" placeholder="0.00" {...register("precio_unitario")} />
                    </div>
                </>
            )}

            {tipoGasto === "Carga < al % mínimo" && (
                <>
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium">Motivo de Carga Baja</label>
                        <select 
                            className="w-full h-12 rounded-xl border-gray-300"
                            {...register("motivo_texto", { required: "Selecciona un motivo" })}
                        >
                            <option value="">Seleccionar Motivo...</option>
                            {opciones.motivosCM.map((op) => (
                                <option key={op.id} value={op.valor}>{op.etiqueta}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Volumen Cargado Real (m³)</label>
                        <Input type="number" step="0.01" placeholder="0.00" {...register("volumen")} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tarifa (S/)</label>
                        <Input type="number" step="0.01" placeholder="0.00" {...register("precio_unitario")} />
                    </div>
                </>
            )}

            {["Gasto Adicional", "Zona Rígida", "Último Punto"].includes(tipoGasto) && (
                 <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Sustento Detallado</label>
                    <Input placeholder="Ej: 2 estibas, S/40 c/u" {...register("sustento", { required: true })} />
                 </div>
            )}

          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-900 dark:text-white">
                Monto Total a Pagar
              </label>
              <div className="w-1/2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">S/</span>
                <Input
                  type="number"
                  step="0.01"
                  className={cn(
                    "pl-10 text-right text-xl font-bold h-14",
                    (tipoGasto === "Falso Flete" || tipoGasto === "Carga < al % mínimo")
                      ? "bg-gray-100 text-brand-700 cursor-not-allowed"
                      : "bg-white border-brand-200 text-gray-900 focus:ring-brand-500"
                  )}
                  readOnly={tipoGasto === "Falso Flete" || tipoGasto === "Carga < al % mínimo"}
                  placeholder="0.00"
                  {...register("monto", { required: true, min: 0.1 })}
                />
              </div>
            </div>
            
            {tipoGasto === "Carga < al % mínimo" && volumen && tarifa && !watch("monto") && (
                 <p className="text-xs text-right text-red-500 mt-2 font-medium">
                    * El volumen cargado supera el mínimo. No corresponde pago adicional.
                 </p>
            )}
          </div>
        </section>

        <Button
            type="submit"
            className="w-full h-14 text-lg font-bold shadow-xl shadow-brand-700/20"
            isLoading={isSubmitting}
        >
            <Save className="mr-2 h-5 w-5" />
            Registrar Solicitud
        </Button>

      </form>
    </div>
  );
}