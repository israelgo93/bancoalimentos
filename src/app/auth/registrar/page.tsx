'use client';

import { useState, FormEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/app/components/SupabaseProvider';
import { Iconos } from '@/app/components/ui/Iconos';
import { CLASES_ESTILO, MENSAJES, CONFIGURACION, FECHAS } from '@/lib/constantes';
import { validarCedulaEcuatoriana, validarRucEcuatoriano } from '@/lib/validaciones';

// Usamos un tipo string literal para los roles para evitar problemas de importación del enum
type RolSeleccionado = 'DONANTE' | 'SOLICITANTE' | null;

// --- Componente principal de la página de registro ---
export default function PaginaRegistro() {
  const router = useRouter();
  const { supabase } = useSupabase();

  // --- Estados del componente en español ---
  const [rolSeleccionado, setRolSeleccionado] = useState<RolSeleccionado>(null);
  const [error, setError] = useState<string | null>(null);
  const [estaCargando, setEstaCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [consultandoIdentificacion, setConsultandoIdentificacion] = useState(false);
  const [nombreBloqueado, setNombreBloqueado] = useState(true);
  const [identificacionValidada, setIdentificacionValidada] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);
  const [verConfirmarContrasena, setVerConfirmarContrasena] = useState(false);
  const [validacionDocumento, setValidacionDocumento] = useState<{
    esValido: boolean;
    mensaje: string | null;
  }>({ esValido: false, mensaje: null });
  const [datosFormulario, setDatosFormulario] = useState({
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    nombre: '',
    tipo_persona: 'Natural',
    cedula: '',
    ruc: '',
    direccion: '',
    telefono: '',
  });

  // --- Manejadores de eventos en español ---
  const manejarSeleccionRol = (rol: 'DONANTE' | 'SOLICITANTE') => {
    setRolSeleccionado(rol);
  };

  const manejarCambio = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validar que solo se ingresen números en cédula y RUC
    if (name === 'cedula' || name === 'ruc') {
      const soloNumeros = value.replace(/\D/g, '');
      const longitudMaxima = name === 'cedula' ? 10 : 13;
      
      if (soloNumeros.length <= longitudMaxima) {
        setDatosFormulario((prev) => ({ ...prev, [name]: soloNumeros }));
      }
    } else {
      setDatosFormulario((prev) => ({ ...prev, [name]: value }));
    }
    
    setError(null);
  };

  // --- Función para consultar identificación ---
  const consultarIdentificacion = useCallback(async () => {
    const numero = datosFormulario.tipo_persona === 'Natural' ? datosFormulario.cedula : datosFormulario.ruc;
    
    if (!numero || numero.length < 10) {
      setNombreBloqueado(true);
      setIdentificacionValidada(false);
      return;
    }

    // Validar formato y algoritmo antes de consultar la API
    let esValido = false;
    if (datosFormulario.tipo_persona === 'Natural') {
      esValido = validarCedulaEcuatoriana(numero);
    } else {
      esValido = validarRucEcuatoriano(numero);
    }

    if (!esValido) {
      setError(datosFormulario.tipo_persona === 'Natural' 
        ? 'La cédula ingresada no es válida. Verifique que tenga 10 dígitos y que el dígito verificador sea correcto.'
        : 'El RUC ingresado no es válido. Verifique que tenga 13 dígitos y que el dígito verificador sea correcto.'
      );
      setNombreBloqueado(true);
      setIdentificacionValidada(false);
      return;
    }

    setConsultandoIdentificacion(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/consultar-identificacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: datosFormulario.tipo_persona === 'Natural' ? 'CEDULA' : 'RUC',
          numero: numero,
        }),
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos && (datos.razon_social || datos.nombre_completo)) {
        // Autocompletar y bloquear el campo nombre solo si se obtienen datos reales válidos
        const nombreObtenido = datos.razon_social || datos.nombre_completo;
        if (nombreObtenido && nombreObtenido.trim() !== '' && nombreObtenido !== 'No disponible') {
          setDatosFormulario(prev => ({
            ...prev,
            nombre: nombreObtenido,
            direccion: datos.direccion || prev.direccion,
            telefono: datos.telefono || prev.telefono,
          }));
          setNombreBloqueado(true);
          setIdentificacionValidada(true);
          setMensajeExito(MENSAJES.EXITO.DATOS_OBTENIDOS);
          setTimeout(() => setMensajeExito(null), 3000);
        } else {
          // Si no se obtienen datos válidos, permitir ingreso manual
          setNombreBloqueado(false);
          setIdentificacionValidada(true);
          setError(MENSAJES.INFORMACION.INGRESO_MANUAL_PERMITIDO);
        }
      } else {
        // Permitir ingreso manual si no se obtienen datos
        setNombreBloqueado(false);
        setIdentificacionValidada(true);
        if (datos.permite_manual) {
          setError(MENSAJES.INFORMACION.INGRESO_MANUAL_PERMITIDO);
        } else {
          setError(datos.error || MENSAJES.ERRORES.ERROR_CONSULTA_IDENTIFICACION);
        }
      }
    } catch {
      setNombreBloqueado(false);
      setIdentificacionValidada(true);
      setError(MENSAJES.ERRORES.ERROR_CONEXION);
    } finally {
      setConsultandoIdentificacion(false);
    }
  }, [datosFormulario.tipo_persona, datosFormulario.cedula, datosFormulario.ruc]);

  // --- Efecto para consultar automáticamente cuando se ingresa un número válido ---
  useEffect(() => {
    const numero = datosFormulario.tipo_persona === 'Natural' ? datosFormulario.cedula : datosFormulario.ruc;
    const longitudRequerida = datosFormulario.tipo_persona === 'Natural' ? 10 : 13;
    
    // Limpiar errores cuando el usuario está escribiendo
    if (numero.length < longitudRequerida) {
      setIdentificacionValidada(false);
      setError(null);
      setValidacionDocumento({ esValido: false, mensaje: null });
      return;
    }

    // Validar formato y algoritmo
    let esValido = false;
    if (datosFormulario.tipo_persona === 'Natural') {
      esValido = validarCedulaEcuatoriana(numero);
    } else {
      esValido = validarRucEcuatoriano(numero);
    }

    if (!esValido) {
      const mensajeError = datosFormulario.tipo_persona === 'Natural' 
        ? 'La cédula ingresada no es válida. Verifique que tenga 10 dígitos y que el dígito verificador sea correcto.'
        : 'El RUC ingresado no es válido. Verifique que tenga 13 dígitos y que el dígito verificador sea correcto.';
      
      setError(mensajeError);
      setValidacionDocumento({ esValido: false, mensaje: mensajeError });
      setIdentificacionValidada(false);
      return;
    }

    // Si es válido, limpiar errores y proceder con la consulta a la API
    setValidacionDocumento({ esValido: true, mensaje: null });
    setError(null);
    
    const timeoutId = setTimeout(() => {
      consultarIdentificacion();
    }, CONFIGURACION.DELAY_CONSULTA_IDENTIFICACION);
    
    return () => clearTimeout(timeoutId);
  }, [datosFormulario.cedula, datosFormulario.ruc, datosFormulario.tipo_persona, consultarIdentificacion]);

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (datosFormulario.contrasena !== datosFormulario.confirmarContrasena) {
      setError(MENSAJES.ERRORES.CONTRASENAS_NO_COINCIDEN);
      return;
    }
    
    setEstaCargando(true);
    setError(null);

    try {
      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: datosFormulario.correo,
        password: datosFormulario.contrasena,
        options: {
          data: {
            nombre: datosFormulario.nombre,
            rol: rolSeleccionado,
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error(MENSAJES.ERRORES.ERROR_REGISTRO);
      }

      // 2. Crear perfil adicional en nuestra tabla personalizada
      const { error: profileError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          rol: rolSeleccionado,
          nombre: datosFormulario.nombre,
          tipo_persona: datosFormulario.tipo_persona,
          cedula: datosFormulario.tipo_persona === 'Natural' ? datosFormulario.cedula : null,
          ruc: datosFormulario.tipo_persona === 'Juridica' ? datosFormulario.ruc : null,
          direccion: datosFormulario.direccion,
          telefono: datosFormulario.telefono,
          correo: datosFormulario.correo,
          email_verified: false,
          created_at: FECHAS.ahora(),
          updated_at: FECHAS.ahora(),
        });

      if (profileError) {
        // Si falla la creación del perfil, eliminar el usuario de auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(profileError.message);
      }

      // 3. Mostrar mensaje de éxito
      setMensajeExito(MENSAJES.EXITO.REGISTRO_EXITOSO);
      
      // 4. Redirigir al inicio de sesión después de mostrar el mensaje
      setTimeout(() => {
        router.push('/auth/iniciar-sesion?registro=exitoso');
      }, CONFIGURACION.TIEMPO_REDIRECCION);

    } catch (err) {
      setError(err instanceof Error ? err.message : MENSAJES.ERRORES.ERROR_INESPERADO);
    } finally {
      setEstaCargando(false);
    }
  };

  // --- Renderizado del componente ---
  return (
    <>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          {rolSeleccionado ? `Registro de ${rolSeleccionado === 'DONANTE' ? 'Donante' : 'Solicitante'}` : 'Únete a nuestra comunidad'}
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/auth/iniciar-sesion" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
            Inicia sesión aquí
          </Link>
        </p>
      </div>

      {!rolSeleccionado ? (
        // --- PASO 1: Selección de Rol ---
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button onClick={() => manejarSeleccionRol('DONANTE')} className="rol-button">
            <Iconos.Donante />
            <span className="font-bold text-xl">Soy un Donante</span>
            <p className="text-sm text-gray-600 mt-2">Quiero ofrecer productos y ayuda.</p>
          </button>
          <button onClick={() => manejarSeleccionRol('SOLICITANTE')} className="rol-button">
            <Iconos.Solicitante />
            <span className="font-bold text-xl">Soy un Solicitante</span>
            <p className="text-sm text-gray-600 mt-2">Necesito recibir productos y ayuda.</p>
          </button>
        </div>
      ) : (
        // --- PASO 2: Formulario de Registro ---
        <>
          {mensajeExito ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Iconos.Exito />
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">¡Registro Exitoso!</h3>
              <p className="text-gray-600 mb-4">{mensajeExito}</p>
              <p className="text-sm text-gray-500">Serás redirigido automáticamente al inicio de sesión...</p>
            </div>
          ) : (
            <form className="space-y-4 animate-fade-in" onSubmit={manejarEnvio}>
              {/* Campo oculto para el rol */}
              <input type="hidden" name="rol" value={rolSeleccionado} />

              {/* PASO 2.1: Campos de Identificación */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Paso 1: Identificación</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tipo_persona" className={CLASES_ESTILO.label}>Tipo de Persona</label>
                    <select id="tipo_persona" name="tipo_persona" className={CLASES_ESTILO.input} value={datosFormulario.tipo_persona} onChange={manejarCambio}>
                      <option value="Natural">Natural (Cédula)</option>
                      <option value="Juridica">Jurídica (RUC)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={datosFormulario.tipo_persona === 'Natural' ? 'cedula' : 'ruc'} className={CLASES_ESTILO.label}>
                      {datosFormulario.tipo_persona === 'Natural' ? 'Cédula' : 'RUC'}
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        id={datosFormulario.tipo_persona === 'Natural' ? 'cedula' : 'ruc'}
                        name={datosFormulario.tipo_persona === 'Natural' ? 'cedula' : 'ruc'}
                        required 
                        className={`${CLASES_ESTILO.input} ${
                          validacionDocumento.esValido 
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
                            : validacionDocumento.mensaje 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : ''
                        }`}
                        value={datosFormulario.tipo_persona === 'Natural' ? datosFormulario.cedula : datosFormulario.ruc} 
                        onChange={manejarCambio} 
                        placeholder={datosFormulario.tipo_persona === 'Natural' ? '0102030405' : '0102030405001'}
                      />
                      {consultandoIdentificacion && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Iconos.Cargando />
                        </div>
                      )}
                      {validacionDocumento.esValido && !consultandoIdentificacion && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                      {validacionDocumento.mensaje && !consultandoIdentificacion && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {MENSAJES.INFORMACION.AUTocompletado_DISPONIBLE}
                    </p>
                    {validacionDocumento.mensaje && (
                      <p className="text-xs text-red-600 mt-1">
                        {validacionDocumento.mensaje}
                      </p>
                    )}
                  </div>
                </div>

                {identificacionValidada && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      {MENSAJES.INFORMACION.IDENTIFICACION_VALIDADA}
                    </p>
                  </div>
                )}
              </div>

              {/* PASO 2.2: Resto de Campos (solo si la identificación está validada) */}
              {identificacionValidada && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Paso 2: Información Personal</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="nombre" className={CLASES_ESTILO.label}>Nombre / Razón Social</label>
                      <input type="text" id="nombre" name="nombre" required className={CLASES_ESTILO.input} value={datosFormulario.nombre} onChange={manejarCambio} placeholder="Tu nombre completo o el de tu empresa" disabled={nombreBloqueado} />
                    </div>
                    
                    <div>
                      <label htmlFor="correo" className={CLASES_ESTILO.label}>Correo Electrónico</label>
                      <input type="email" id="correo" name="correo" required className={CLASES_ESTILO.input} value={datosFormulario.correo} onChange={manejarCambio} placeholder="tu@correo.com" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="direccion" className={CLASES_ESTILO.label}>Dirección</label>
                        <input type="text" id="direccion" name="direccion" required className={CLASES_ESTILO.input} value={datosFormulario.direccion} onChange={manejarCambio} placeholder="Tu dirección de domicilio" />
                      </div>
                      <div>
                        <label htmlFor="telefono" className={CLASES_ESTILO.label}>Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" required className={CLASES_ESTILO.input} value={datosFormulario.telefono} onChange={manejarCambio} placeholder="0987654321" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contrasena" className={CLASES_ESTILO.label}>Contraseña</label>
                        <div className="relative">
                          <input
                            type={verContrasena ? "text" : "password"}
                            id="contrasena"
                            name="contrasena"
                            required
                            className={CLASES_ESTILO.input + ' pr-12'}
                            value={datosFormulario.contrasena}
                            onChange={manejarCambio}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center cursor-pointer focus:outline-none group bg-transparent border-none"
                            onClick={() => setVerContrasena((v) => !v)}
                            aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            <svg
                              className={`w-5 h-5 block pointer-events-none ${verContrasena ? 'text-blue-600' : 'text-gray-400'}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="confirmarContrasena" className={CLASES_ESTILO.label}>Confirmar Contraseña</label>
                        <div className="relative">
                          <input
                            type={verConfirmarContrasena ? "text" : "password"}
                            id="confirmarContrasena"
                            name="confirmarContrasena"
                            required
                            className={CLASES_ESTILO.input + ' pr-12'}
                            value={datosFormulario.confirmarContrasena}
                            onChange={manejarCambio}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center cursor-pointer focus:outline-none group bg-transparent border-none"
                            onClick={() => setVerConfirmarContrasena((v) => !v)}
                            aria-label={verConfirmarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            <svg
                              className={`w-5 h-5 block pointer-events-none ${verConfirmarContrasena ? 'text-blue-600' : 'text-gray-400'}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
              
              {identificacionValidada && (
                <div>
                  <button type="submit" disabled={estaCargando || consultandoIdentificacion} className={CLASES_ESTILO.boton}>
                    {estaCargando ? 'Creando cuenta...' : 'Crear mi Cuenta'}
                  </button>
                </div>
              )}
            </form>
          )}
        </>
      )}
      
      {/* Botón para regresar a la selección de rol */}
      {rolSeleccionado && !mensajeExito && (
        <div className="mt-4 text-center">
          <button onClick={() => setRolSeleccionado(null)} className="text-sm font-medium text-blue-600 hover:text-blue-500">
            &larr; Volver a seleccionar rol
          </button>
        </div>
      )}

      {/* Estilos para los botones de rol y animaciones */}
      <style jsx>{`
        .rol-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          background-color: white;
          text-align: center;
          transition: all 0.2s ease-in-out;
        }
        .rol-button:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-color: #3b82f6;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out forwards;
        }
      `}</style>
    </>
  );
} 