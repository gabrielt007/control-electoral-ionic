export interface EstadoCarga<T> {
  cargando: boolean;
  datos: T | null;
  error: Error | null;
}
