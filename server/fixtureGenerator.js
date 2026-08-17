/**
 * Generador de fixture round-robin (método del círculo / polygon method).
 * Recibe una lista de identificadores de equipo YA ORDENADA (el orden importa:
 * determina qué cruces salen en la Fecha 1, Fecha 2, etc). Si la cantidad de
 * equipos es impar, se debe agregar el valor especial 'LIBRE' antes de llamar
 * a esta función para completar un número par.
 *
 * Devuelve:
 *  - partidos: [{ fecha, localId, visitaId }]  (no incluye cruces contra 'LIBRE')
 *  - byes:     [{ fecha, equipoId }]           (quién descansa esa fecha)
 */
function generarRoundRobin(listaIds) {
  const n = listaIds.length;
  if (n % 2 !== 0) {
    throw new Error('generarRoundRobin requiere una cantidad par de elementos (agrega LIBRE si es impar)');
  }
  const totalFechas = n - 1;
  const mitad = n / 2;
  const arr = [...listaIds];
  const partidos = [];
  const byes = [];

  for (let fecha = 1; fecha <= totalFechas; fecha++) {
    for (let i = 0; i < mitad; i++) {
      const local = arr[i];
      const visita = arr[n - 1 - i];
      if (local === 'LIBRE') {
        byes.push({ fecha, equipoId: visita });
      } else if (visita === 'LIBRE') {
        byes.push({ fecha, equipoId: local });
      } else {
        partidos.push({ fecha, localId: local, visitaId: visita });
      }
    }
    // Rotar: fijar el primero, mover el resto (método del círculo)
    arr.splice(1, 0, arr.pop());
  }

  return { partidos, byes };
}

module.exports = { generarRoundRobin };
